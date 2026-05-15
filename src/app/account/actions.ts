"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { sendEmail, emailTemplates } from "@/lib/email";
import { audit } from "@/lib/audit";

export async function freezeSubscriptionAction(subscriptionId: string) {
  const user = await requireUser();

  const sub = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });
  if (!sub || sub.userId !== user.id || sub.status !== "ACTIVE") return;

  await db.subscription.update({
    where: { id: subscriptionId },
    data: { status: "FROZEN", frozenAt: new Date() },
  });

  void audit({
    actorId: user.id,
    action: "FREEZE_SUBSCRIPTION",
    entity: "Subscription",
    entityId: subscriptionId,
  });

  void sendEmail({
    to: user.email,
    ...emailTemplates.subscriptionFrozen({
      firstName: user.firstName,
      planName: sub.plan.name,
    }),
  });

  revalidatePath("/account");
}

export async function unfreezeSubscriptionAction(subscriptionId: string) {
  const user = await requireUser();

  const sub = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });
  if (!sub || sub.userId !== user.id || sub.status !== "FROZEN") return;

  // Extend endDate by the time it was frozen
  const frozenMs = sub.frozenAt ? Date.now() - sub.frozenAt.getTime() : 0;
  const newEndDate = new Date(sub.endDate.getTime() + frozenMs);

  await db.subscription.update({
    where: { id: subscriptionId },
    data: { status: "ACTIVE", resumedAt: new Date(), frozenAt: null, endDate: newEndDate },
  });

  void audit({
    actorId: user.id,
    action: "UNFREEZE_SUBSCRIPTION",
    entity: "Subscription",
    entityId: subscriptionId,
  });

  void sendEmail({
    to: user.email,
    ...emailTemplates.subscriptionResumed({
      firstName: user.firstName,
      planName: sub.plan.name,
      endDate: newEndDate,
    }),
  });

  revalidatePath("/account");
}
