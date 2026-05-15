"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  clearSessionCookie,
  createSession,
  hashPassword,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";

const registerSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Minimum 8 caractères"),
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  phone: z.string().optional(),
});

export type AuthState = { error?: string } | null;

export async function registerAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
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

  const existing = await db.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  if (existing) return { error: "Un compte existe déjà avec cet email" };

  const user = await db.user.create({
    data: {
      email: parsed.data.email.toLowerCase(),
      passwordHash: await hashPassword(parsed.data.password),
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone,
    },
  });

  const token = await createSession({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  await setSessionCookie(token);
  redirect("/schedule");
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Email ou mot de passe invalide" };

  const user = await db.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  if (!user) return { error: "Identifiants incorrects" };
  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) return { error: "Identifiants incorrects" };

  const token = await createSession({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  await setSessionCookie(token);
  redirect(user.role === "ADMIN" ? "/admin" : "/schedule");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/");
}
