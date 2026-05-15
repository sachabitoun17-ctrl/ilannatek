"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function purchasePackAction(planId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const plan = await db.plan.findUnique({ where: { id: planId } });
  if (!plan || plan.type !== "CREDIT_PACK" || !plan.active) {
    return { ok: false as const, error: "Pack indisponible" };
  }

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { creditsBalance: { increment: plan.creditsAmount ?? 0 } },
    }),
    db.transaction.create({
      data: {
        userId: user.id,
        planId: plan.id,
        type: "PURCHASE_PACK",
        amountCents: plan.priceCents,
        creditsDelta: plan.creditsAmount ?? 0,
        description: `Achat ${plan.name}`,
      },
    }),
  ]);

  revalidatePath("/account");
  revalidatePath("/packs");
  return { ok: true as const, credits: plan.creditsAmount };
}

export async function purchaseSubscriptionAction(planId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const plan = await db.plan.findUnique({ where: { id: planId } });
  if (!plan || plan.type !== "SUBSCRIPTION" || !plan.active) {
    return { ok: false as const, error: "Abonnement indisponible" };
  }

  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + (plan.intervalDays ?? 30));

  await db.$transaction([
    db.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        startDate: start,
        endDate: end,
        status: "ACTIVE",
      },
    }),
    db.user.update({
      where: { id: user.id },
      data: {
        creditsBalance: { increment: plan.creditsPerCycle ?? 0 },
      },
    }),
    db.transaction.create({
      data: {
        userId: user.id,
        planId: plan.id,
        type: "PURCHASE_SUBSCRIPTION",
        amountCents: plan.priceCents,
        creditsDelta: plan.creditsPerCycle ?? 0,
        description: `Abonnement ${plan.name}`,
      },
    }),
  ]);

  revalidatePath("/account");
  revalidatePath("/subscriptions");
  return { ok: true as const };
}
