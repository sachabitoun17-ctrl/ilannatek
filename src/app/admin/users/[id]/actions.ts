"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { sendEmail, emailTemplates } from "@/lib/email";

export async function adminAdjustCreditsAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = formData.get("userId")?.toString();
  const delta = parseInt(formData.get("delta")?.toString() ?? "0", 10);
  const note = formData.get("note")?.toString() ?? "Ajustement administrateur";
  if (!userId || Number.isNaN(delta) || delta === 0) return;

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { creditsBalance: { increment: delta } },
    }),
    db.transaction.create({
      data: {
        userId,
        type: "ADMIN_ADJUST",
        creditsDelta: delta,
        description: note,
      },
    }),
  ]);

  void audit({
    actorId: admin.id,
    action: "ADMIN_ADJUST_CREDITS",
    entity: "User",
    entityId: userId,
    metadata: { delta, note },
  });

  revalidatePath(`/admin/users/${userId}`);
}

export async function adminBanUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = formData.get("userId")?.toString();
  const ban = formData.get("ban") === "1";
  if (!userId) return;

  await db.user.update({
    where: { id: userId },
    data: { banned: ban, ...(ban ? { sessionVersion: { increment: 1 } } : {}) },
  });

  void audit({
    actorId: admin.id,
    action: ban ? "BAN_USER" : "UNBAN_USER",
    entity: "User",
    entityId: userId,
  });

  revalidatePath(`/admin/users/${userId}`);
}

export async function adminFreezeCreditsAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = formData.get("userId")?.toString();
  const untilStr = formData.get("until")?.toString();
  if (!userId) return;

  const until = untilStr ? new Date(untilStr) : null;

  await db.user.update({
    where: { id: userId },
    data: { creditsFrozenUntil: until },
  });

  void audit({
    actorId: admin.id,
    action: until ? "FREEZE_CREDITS" : "UNFREEZE_CREDITS",
    entity: "User",
    entityId: userId,
    metadata: until ? { until: until.toISOString() } : undefined,
  });

  revalidatePath(`/admin/users/${userId}`);
}

export async function adminCancelSubscriptionAction(formData: FormData) {
  const admin = await requireAdmin();
  const subscriptionId = formData.get("subscriptionId")?.toString();
  if (!subscriptionId) return;

  const sub = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { user: true, plan: true },
  });
  if (!sub) return;

  await db.subscription.update({
    where: { id: subscriptionId },
    data: { status: "CANCELLED", autoRenew: false },
  });

  void audit({
    actorId: admin.id,
    action: "CANCEL_SUBSCRIPTION",
    entity: "Subscription",
    entityId: subscriptionId,
  });

  void sendEmail({
    to: sub.user.email,
    ...emailTemplates.subscriptionCancelled({
      firstName: sub.user.firstName,
      planName: sub.plan.name,
    }),
  });

  revalidatePath(`/admin/users/${sub.userId}`);
}

export async function adminSetRoleAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = formData.get("userId")?.toString();
  const role = formData.get("role")?.toString();
  if (!userId || !role || !["USER", "INSTRUCTOR", "ADMIN"].includes(role)) return;

  await db.user.update({ where: { id: userId }, data: { role } });

  void audit({
    actorId: admin.id,
    action: "SET_ROLE",
    entity: "User",
    entityId: userId,
    metadata: { role },
  });

  revalidatePath(`/admin/users/${userId}`);
}

export async function adminRefundBookingAction(formData: FormData) {
  const admin = await requireAdmin();
  const bookingId = formData.get("bookingId")?.toString();
  if (!bookingId) return;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { user: true, session: { include: { classType: true } } },
  });
  if (!booking || booking.creditsUsed === 0) return;

  await db.$transaction([
    db.booking.update({ where: { id: bookingId }, data: { status: "CANCELLED", cancelledAt: new Date() } }),
    db.user.update({ where: { id: booking.userId }, data: { creditsBalance: { increment: booking.creditsUsed } } }),
    db.transaction.create({
      data: {
        userId: booking.userId,
        type: "ADMIN_ADJUST",
        creditsDelta: booking.creditsUsed,
        description: `Remboursement admin — ${booking.session.classType.name}`,
      },
    }),
  ]);

  void audit({
    actorId: admin.id,
    action: "ADMIN_REFUND_BOOKING",
    entity: "Booking",
    entityId: bookingId,
    metadata: { creditsRefunded: booking.creditsUsed },
  });

  revalidatePath(`/admin/users/${booking.userId}`);
}
