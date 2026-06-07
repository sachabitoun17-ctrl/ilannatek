"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, hashPassword, verifyPassword, clearSessionCookie } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { sendEmail, emailTemplates } from "@/lib/email";

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();

  const firstName = formData.get("firstName")?.toString().trim();
  const lastName = formData.get("lastName")?.toString().trim();
  const email = formData.get("email")?.toString().toLowerCase().trim();
  const phone = formData.get("phone")?.toString().trim() || null;

  if (!firstName || !lastName || !email) {
    redirect("/account/profile?error=Champs+obligatoires+manquants");
  }

  // Check email not taken by another user
  if (email !== user.email) {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      redirect("/account/profile?error=Cet+email+est+déjà+utilisé");
    }
  }

  await db.user.update({
    where: { id: user.id },
    data: { firstName, lastName, email, phone },
  });

  void audit({ actorId: user.id, action: "UPDATE_PROFILE", entity: "User", entityId: user.id });

  redirect("/account/profile?success=Profil+mis+à+jour");
}

export async function changePasswordAction(formData: FormData) {
  const user = await requireUser();

  const current = formData.get("current")?.toString();
  const password = formData.get("password")?.toString();
  const confirm = formData.get("passwordConfirm")?.toString();

  if (!current || !password || !confirm) {
    redirect("/account/profile?error=Champs+obligatoires+manquants");
  }

  if (password !== confirm) {
    redirect("/account/profile?error=Les+mots+de+passe+ne+correspondent+pas");
  }

  if (password.length < 8) {
    redirect("/account/profile?error=8+caractères+minimum");
  }

  const dbUser = await db.user.findUnique({ where: { id: user.id } });
  if (!dbUser) redirect("/login");

  const valid = await verifyPassword(current, dbUser.passwordHash);
  if (!valid) {
    redirect("/account/profile?error=Mot+de+passe+actuel+incorrect");
  }

  const passwordHash = await hashPassword(password);
  await db.user.update({
    where: { id: user.id },
    // bump sessionVersion — user will need to log in again on other devices
    data: { passwordHash, sessionVersion: { increment: 1 } },
  });

  void audit({ actorId: user.id, action: "CHANGE_PASSWORD", entity: "User", entityId: user.id });

  redirect("/account/profile?success=Mot+de+passe+mis+à+jour");
}

export async function deleteAccountAction(formData: FormData) {
  const user = await requireUser();

  const confirm = formData.get("confirm")?.toString();
  if (confirm !== "SUPPRIMER") {
    redirect("/account/profile?error=Tapez+SUPPRIMER+pour+confirmer");
  }

  // Send confirmation email BEFORE anonymizing (we need the real email)
  void sendEmail({
    to: user.email,
    ...emailTemplates.accountDeleted({ firstName: user.firstName }),
  });

  const anonymizedEmail = `deleted+${user.id}@ilannatek-deleted.local`;
  await db.user.update({
    where: { id: user.id },
    data: {
      email: anonymizedEmail,
      firstName: "Compte",
      lastName: "Supprimé",
      phone: null,
      passwordHash: "",
      stripeCustomerId: null,
      active: false,
      sessionVersion: { increment: 1 },
    },
  });

  await db.passwordResetToken.deleteMany({ where: { userId: user.id } });

  void audit({
    actorId: user.id,
    action: "DELETE_ACCOUNT",
    entity: "User",
    entityId: user.id,
  });

  await clearSessionCookie();
  redirect("/");
}
