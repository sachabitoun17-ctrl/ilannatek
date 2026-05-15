"use server";

import { redirect } from "next/navigation";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendEmail, emailTemplates } from "@/lib/email";

export async function forgotPasswordAction(formData: FormData) {
  const email = formData.get("email")?.toString().toLowerCase().trim();
  if (!email) return;

  const user = await db.user.findUnique({ where: { email } });

  if (user) {
    // Invalidate existing tokens for this user
    await db.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await db.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const resetUrl = `${siteUrl}/reset-password?token=${token}`;

    void sendEmail({
      to: user.email,
      ...emailTemplates.passwordReset({ firstName: user.firstName, resetUrl }),
    });
  }

  // Always redirect (don't reveal whether email exists)
  redirect("/forgot-password?sent=1");
}
