"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail, emailTemplates } from "@/lib/email";

const emailSchema = z.string().email("Email invalide").max(255).toLowerCase();

export type InviteState = { error?: string; success?: string } | null;

export async function sendInviteAction(
  _prev: InviteState,
  formData: FormData
): Promise<InviteState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const raw = formData.get("toEmail");
  const parsed = emailSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Email invalide" };
  }

  const toEmail = parsed.data;

  // Can't invite yourself
  if (toEmail === user.email) {
    return { error: "Vous ne pouvez pas vous inviter vous-même." };
  }

  // Check if this email already has an account
  const existing = await db.user.findUnique({ where: { email: toEmail } });
  if (existing) {
    return { error: "Cet email est déjà associé à un compte." };
  }

  const now = new Date();

  // Check if already invited this email and invite is still pending
  const alreadyInvited = await db.friendInvite.findFirst({
    where: {
      fromUserId: user.id,
      toEmail,
      usedAt: null,
      expiresAt: { gt: now },
    },
  });
  if (alreadyInvited) {
    return { error: "Vous avez déjà envoyé une invitation à cet email." };
  }

  // Limit: max 10 active (non-expired, non-used) invites per user
  const activeInvites = await db.friendInvite.count({
    where: {
      fromUserId: user.id,
      usedAt: null,
      expiresAt: { gt: now },
    },
  });

  if (activeInvites >= 10) {
    return {
      error:
        "Vous avez atteint la limite de 10 invitations actives. Attendez qu'une expire ou soit acceptée.",
    };
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await db.friendInvite.create({
    data: {
      fromUserId: user.id,
      toEmail,
      token,
      creditsGranted: 1,
      expiresAt,
    },
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const acceptUrl = `${siteUrl}/invite/${token}`;

  const fromName = `${user.firstName} ${user.lastName}`;

  void sendEmail({
    to: toEmail,
    ...emailTemplates.friendInvite({ fromName, toEmail, acceptUrl }),
  });

  return { success: `Invitation envoyée à ${toEmail} !` };
}
