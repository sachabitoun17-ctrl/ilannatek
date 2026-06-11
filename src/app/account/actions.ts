"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { sendEmail, emailTemplates } from "@/lib/email";
import { audit } from "@/lib/audit";
import { stripeEnabled, cancelSubscription } from "@/lib/stripe";

export async function cancelSubscriptionAction(subscriptionId: string) {
  const user = await requireUser();

  const sub = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });
  if (!sub || sub.userId !== user.id || sub.status === "CANCELLED") return;

  // For Stripe-billed subs: cancel at period end (member keeps access until endDate)
  if (stripeEnabled() && sub.stripeSubscriptionId) {
    await cancelSubscription(sub.stripeSubscriptionId);
  }

  await db.subscription.update({
    where: { id: subscriptionId },
    data: { status: "CANCELLED", autoRenew: false },
  });

  void audit({
    actorId: user.id,
    action: "CANCEL_SUBSCRIPTION",
    entity: "Subscription",
    entityId: subscriptionId,
  });

  void sendEmail({
    to: user.email,
    ...emailTemplates.subscriptionCancelled({
      firstName: user.firstName,
      planName: sub.plan.name,
    }),
  });

  revalidatePath("/account");
}

export async function freezeSubscriptionAction(subscriptionId: string) {
  const user = await requireUser();

  const sub = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });
  if (!sub || sub.userId !== user.id || sub.status !== "ACTIVE") return;
  // Stripe-billed subscriptions: freeze is not supported (we can't pause Stripe billing here)
  if (stripeEnabled() && sub.stripeSubscriptionId) return;

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
