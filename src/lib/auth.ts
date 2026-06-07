import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cache } from "react";
import { db } from "./db";

function getSecret() {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    throw new Error("AUTH_SECRET env var is required — set it in .env.local");
  }
  return new TextEncoder().encode(s);
}
const COOKIE_NAME = "ilannatek_session";
const SESSION_DAYS = 30;

export type SessionPayload = {
  userId: string;
  email: string;
  role: string;
  v: number; // session version
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
}

export async function verifyJwt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

/**
 * Reads JWT from cookie and validates it against the DB session version.
 * This lets us invalidate all of a user's sessions by bumping User.sessionVersion.
 */
// cache() deduplicates this DB call within a single request —
// layout + page both call it but only one query goes to the DB.
export const getCurrentUser = cache(async function getCurrentUser() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyJwt(token);
  if (!payload) return null;
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      creditsBalance: true,
      sessionVersion: true,
      active: true,
      banned: true,
      creditsFrozenUntil: true,
    },
  });
  if (!user) return null;
  if (!user.active || user.banned) return null;
  if (user.sessionVersion !== payload.v) return null;
  return user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

export async function requireStaff() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN" && user.role !== "INSTRUCTOR") redirect("/");
  return user;
}

export function getClientIp(): string | undefined {
  try {
    const h = headers();
    return (
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      undefined
    );
  } catch {
    return undefined;
  }
}

/**
 * Bump a user's sessionVersion to invalidate all their existing JWTs.
 */
export async function revokeAllSessions(userId: string) {
  await db.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
  });
}
