"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function resetPasswordAction(formData: FormData) {
  const token = formData.get("token")?.toString();
  const password = formData.get("password")?.toString();
  const confirm = formData.get("passwordConfirm")?.toString();

  if (!token || !password || !confirm) {
    redirect(`/reset-password?token=${token}&error=Champs+manquants`);
  }

  if (password !== confirm) {
    redirect(`/reset-password?token=${token}&error=Les+mots+de+passe+ne+correspondent+pas`);
  }

  if (password.length < 8) {
    redirect(`/reset-password?token=${token}&error=8+caractères+minimum`);
  }

  const record = await db.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    redirect("/forgot-password?sent=1");
  }

  const passwordHash = await hashPassword(password);

  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      // bump sessionVersion to invalidate all existing JWTs
      data: { passwordHash, sessionVersion: { increment: 1 } },
    }),
    db.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  redirect("/login?reset=1");
}
