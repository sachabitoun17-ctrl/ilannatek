"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  clearSessionCookie,
  createSession,
  getClientIp,
  hashPassword,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { sendEmail, emailTemplates } from "@/lib/email";
import { getSettings } from "@/lib/settings";

const registerSchema = z.object({
  email: z.string().email("Email invalide").max(255),
  password: z.string().min(8, "Minimum 8 caractères").max(200),
  firstName: z.string().min(1, "Prénom requis").max(100),
  lastName: z.string().min(1, "Nom requis").max(100),
  phone: z.string().max(40).optional(),
});

export type AuthState = { error?: string } | null;

export async function registerAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const ip = getClientIp() ?? "unknown";
  const rl = rateLimit(`register:${ip}`, LIMITS.REGISTER_PER_IP.max, LIMITS.REGISTER_PER_IP.windowMs);
  if (!rl.allowed) {
    return {
      error: `Trop de tentatives. Réessayez dans ${Math.ceil(rl.retryAfterMs / 60000)}min.`,
    };
  }

  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Données invalides" };
  }

  const settings = await getSettings();
  const existing = await db.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  if (existing) return { error: "Un compte existe déjà avec cet email" };

  // Validate invite token if provided
  const rawInviteToken = formData.get("inviteToken");
  const inviteToken = typeof rawInviteToken === "string" && rawInviteToken.trim() ? rawInviteToken.trim() : null;
  const now = new Date();

  let validInvite: {
    id: string;
    fromUserId: string;
    creditsGranted: number;
    from: { firstName: string };
  } | null = null;

  if (inviteToken) {
    const invite = await db.friendInvite.findUnique({
      where: { token: inviteToken },
      include: { from: { select: { firstName: true } } },
    });
    if (invite && !invite.usedAt && invite.expiresAt > now) {
      validInvite = invite;
    }
  }

  const user = await db.user.create({
    data: {
      email: parsed.data.email.toLowerCase(),
      passwordHash: await hashPassword(parsed.data.password),
      firstName: parsed.data.firstName.trim(),
      lastName: parsed.data.lastName.trim(),
      phone: parsed.data.phone?.trim(),
      creditsBalance: settings.welcomeCredits + (validInvite ? validInvite.creditsGranted : 0),
    },
  });

  if (settings.welcomeCredits > 0) {
    await db.transaction.create({
      data: {
        userId: user.id,
        type: "PROMO",
        creditsDelta: settings.welcomeCredits,
        description: "Crédits de bienvenue",
        paymentStatus: "FREE",
      },
    });
  }

  // Process invite: grant credit to new user, grant credit to inviter, mark invite used
  if (validInvite) {
    // Credit for new user
    await db.transaction.create({
      data: {
        userId: user.id,
        type: "PROMO_BONUS",
        creditsDelta: validInvite.creditsGranted,
        description: `Crédit invitation de ${validInvite.from.firstName}`,
        paymentStatus: "FREE",
      },
    });

    // Credit for inviter
    await db.user.update({
      where: { id: validInvite.fromUserId },
      data: { creditsBalance: { increment: validInvite.creditsGranted } },
    });
    await db.transaction.create({
      data: {
        userId: validInvite.fromUserId,
        type: "PROMO_BONUS",
        creditsDelta: validInvite.creditsGranted,
        description: `Crédit parrainage — ${user.firstName} ${user.lastName} a rejoint le studio`,
        paymentStatus: "FREE",
      },
    });

    // Mark invite used
    await db.friendInvite.update({
      where: { id: validInvite.id },
      data: { usedAt: now },
    });
  }

  await audit({
    actorId: user.id,
    action: "REGISTER",
    entity: "User",
    entityId: user.id,
  });

  // fire-and-forget welcome email
  void sendEmail({
    to: user.email,
    ...emailTemplates.welcome(user.firstName),
  });

  const token = await createSession({
    userId: user.id,
    email: user.email,
    role: user.role,
    v: user.sessionVersion,
  });
  await setSessionCookie(token);
  redirect("/schedule");
}

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
});

export async function loginAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const ip = getClientIp() ?? "unknown";
  const ipLimit = rateLimit(`login-ip:${ip}`, LIMITS.LOGIN_PER_IP.max, LIMITS.LOGIN_PER_IP.windowMs);
  if (!ipLimit.allowed) {
    return { error: "Trop de tentatives depuis cette adresse. Réessayez plus tard." };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Email ou mot de passe invalide" };

  const email = parsed.data.email.toLowerCase();
  const emailLimit = rateLimit(
    `login-email:${email}`,
    LIMITS.LOGIN_PER_EMAIL.max,
    LIMITS.LOGIN_PER_EMAIL.windowMs
  );
  if (!emailLimit.allowed) {
    return { error: "Compte temporairement bloqué après plusieurs tentatives. Réessayez dans 15min." };
  }

  const user = await db.user.findUnique({ where: { email } });

  // Always perform a hash compare to avoid timing oracle on user existence
  const ok = user
    ? await verifyPassword(parsed.data.password, user.passwordHash)
    : await verifyPassword(parsed.data.password, "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid");

  await db.loginAttempt.create({
    data: { userId: user?.id, email, ip, success: !!user && ok },
  });

  if (!user || !ok) return { error: "Identifiants incorrects" };
  if (!user.active) return { error: "Compte désactivé" };
  if (user.banned) return { error: "Compte suspendu" };

  await audit({ actorId: user.id, action: "LOGIN", entity: "User", entityId: user.id });

  const token = await createSession({
    userId: user.id,
    email: user.email,
    role: user.role,
    v: user.sessionVersion,
  });
  await setSessionCookie(token);
  redirect(user.role === "ADMIN" ? "/admin" : user.role === "INSTRUCTOR" ? "/instructor" : "/schedule");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/");
}
