"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import crypto from "node:crypto";
import {
  clearSessionCookie,
  clearPending2faCookie,
  createSession,
  getClientIp,
  getPending2faUserId,
  hashPassword,
  setPending2faCookie,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { sendEmail, emailTemplates } from "@/lib/email";
import { getSettings } from "@/lib/settings";
import { decodeRefCode } from "@/lib/referral";

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

  // Referral link (only if no email invite)
  let referrer: { id: string; email: string; firstName: string; lastName: string } | null = null;
  const rawRefCode = formData.get("refCode");
  const refCodeStr = typeof rawRefCode === "string" && rawRefCode.trim() ? rawRefCode.trim() : null;
  if (!validInvite && refCodeStr) {
    const referrerId = decodeRefCode(refCodeStr);
    // Self-referral guard: referrerId must not be the registering email's account
    if (referrerId) {
      const found = await db.user.findFirst({
        where: { id: referrerId, active: true, email: { not: parsed.data.email.toLowerCase() } },
        select: { id: true, email: true, firstName: true, lastName: true },
      });
      if (found) referrer = found;
    }
  }

  const bonusCredits = validInvite ? validInvite.creditsGranted : referrer ? 1 : 0;

  const user = await db.user.create({
    data: {
      email: parsed.data.email.toLowerCase(),
      passwordHash: await hashPassword(parsed.data.password),
      firstName: parsed.data.firstName.trim(),
      lastName: parsed.data.lastName.trim(),
      phone: parsed.data.phone?.trim(),
      creditsBalance: settings.welcomeCredits + bonusCredits,
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

  if (validInvite) {
    // Atomic: mark invite as used AND grant credits in one transaction (prevents double-use on concurrent registrations)
    const updated = await db.friendInvite.updateMany({
      where: { id: validInvite.id, usedAt: null },
      data: { usedAt: now },
    });
    if (updated.count === 1) {
      await db.$transaction([
        db.transaction.create({
          data: {
            userId: user.id,
            type: "PROMO_BONUS",
            creditsDelta: validInvite.creditsGranted,
            description: `Crédit invitation de ${validInvite.from.firstName}`,
            paymentStatus: "FREE",
          },
        }),
        db.user.update({
          where: { id: validInvite.fromUserId },
          data: { creditsBalance: { increment: validInvite.creditsGranted } },
        }),
        db.transaction.create({
          data: {
            userId: validInvite.fromUserId,
            type: "PROMO_BONUS",
            creditsDelta: validInvite.creditsGranted,
            description: `Crédit parrainage — ${user.firstName} ${user.lastName} a rejoint le studio`,
            paymentStatus: "FREE",
          },
        }),
      ]);
    }
  }

  if (referrer) {
    await db.transaction.create({
      data: {
        userId: user.id,
        type: "PROMO_BONUS",
        creditsDelta: 1,
        description: `Crédit parrainage — invitation de ${referrer.firstName}`,
        paymentStatus: "FREE",
      },
    });
    const updatedReferrer = await db.user.update({
      where: { id: referrer.id },
      data: { creditsBalance: { increment: 1 } },
    });
    await db.transaction.create({
      data: {
        userId: referrer.id,
        type: "PROMO_BONUS",
        creditsDelta: 1,
        description: `Crédit parrainage — ${user.firstName} ${user.lastName} a rejoint le studio`,
        paymentStatus: "FREE",
      },
    });
    void sendEmail({
      to: referrer.email,
      ...emailTemplates.referralJoined({
        firstName: referrer.firstName,
        friendFirstName: user.firstName,
        creditsEarned: 1,
        newBalance: updatedReferrer.creditsBalance,
      }),
    });
  }

  await audit({
    actorId: user.id,
    action: "REGISTER",
    entity: "User",
    entityId: user.id,
  });

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
  redirect("/welcome");
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

  const ok = user
    ? await verifyPassword(parsed.data.password, user.passwordHash)
    : await verifyPassword(parsed.data.password, "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid");

  await db.loginAttempt.create({
    data: { userId: user?.id, email, ip, success: !!user && ok },
  });

  if (!user || !ok) return { error: "Identifiants incorrects" };
  if (!user.active) return { error: "Compte désactivé" };
  if (user.banned) return { error: "Compte suspendu" };

  // 2FA: admins must confirm a one-time code sent by email before getting a session
  if (user.role === "ADMIN") {
    await issueLoginOtp(user.id, user.email, user.firstName);
    await setPending2faCookie(user.id);
    redirect("/login/verify");
  }

  await audit({ actorId: user.id, action: "LOGIN", entity: "User", entityId: user.id });

  const token = await createSession({
    userId: user.id,
    email: user.email,
    role: user.role,
    v: user.sessionVersion,
  });
  await setSessionCookie(token);
  redirect(user.role === "INSTRUCTOR" ? "/instructor" : "/schedule");
}

// ─── 2FA helpers ──────────────────────────────────────────────────────────────

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

async function issueLoginOtp(userId: string, email: string, firstName: string) {
  // Invalidate previous unused codes so only the latest is valid
  await db.loginOtp.deleteMany({ where: { userId, usedAt: null } });

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  await db.loginOtp.create({
    data: {
      userId,
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  await sendEmail({
    to: email,
    ...emailTemplates.loginOtp({ firstName, code }),
  });
}

export async function verifyOtpAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const userId = await getPending2faUserId();
  if (!userId) redirect("/login");

  const code = formData.get("code")?.toString().trim() ?? "";
  if (!/^\d{6}$/.test(code)) return { error: "Code invalide" };

  const otp = await db.loginOtp.findFirst({
    where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return { error: "Code expiré. Reconnectez-vous pour recevoir un nouveau code." };
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    return { error: "Trop de tentatives. Reconnectez-vous pour recevoir un nouveau code." };
  }

  // Count the attempt before comparing — a failed compare must consume an attempt
  await db.loginOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });

  const expected = Buffer.from(otp.codeHash);
  const actual = Buffer.from(hashOtp(code));
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    return { error: "Code incorrect" };
  }

  // Atomic claim: only one concurrent submission can consume the code
  const claim = await db.loginOtp.updateMany({
    where: { id: otp.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claim.count === 0) return { error: "Code déjà utilisé" };

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !user.active || user.banned || user.role !== "ADMIN") redirect("/login");

  await clearPending2faCookie();
  await audit({ actorId: user.id, action: "LOGIN_2FA", entity: "User", entityId: user.id });

  const token = await createSession({
    userId: user.id,
    email: user.email,
    role: user.role,
    v: user.sessionVersion,
  });
  await setSessionCookie(token);
  redirect("/admin");
}

export async function resendOtpAction(): Promise<AuthState> {
  const userId = await getPending2faUserId();
  if (!userId) redirect("/login");

  const rl = rateLimit(`otp-resend:${userId}`, 3, 10 * 60 * 1000);
  if (!rl.allowed) return { error: "Trop de renvois. Patientez quelques minutes." };

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !user.active || user.banned || user.role !== "ADMIN") redirect("/login");

  await issueLoginOtp(user.id, user.email, user.firstName);
  return null;
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/");
}
