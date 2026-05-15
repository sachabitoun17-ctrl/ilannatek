import { db } from "./db";
import { audit } from "./audit";
import { sendEmail, emailTemplates } from "./email";
import {
  createCheckoutSession,
  createOrGetCustomer,
  stripeEnabled,
} from "./stripe";
import { evaluatePromoCode, recordPromoRedemption } from "./promo";

export type CheckoutResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; error: string };

export async function startCheckout(args: {
  userId: string;
  planId: string;
  promoCode?: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<CheckoutResult> {
  const user = await db.user.findUnique({ where: { id: args.userId } });
  if (!user) return { ok: false, error: "Utilisateur introuvable" };

  const plan = await db.plan.findUnique({ where: { id: args.planId } });
  if (!plan || !plan.active) return { ok: false, error: "Plan indisponible" };

  if (plan.introOnly) {
    const previousPurchases = await db.transaction.count({
      where: {
        userId: args.userId,
        type: { in: ["PURCHASE_PACK", "PURCHASE_SUBSCRIPTION"] },
        paymentStatus: "PAID",
      },
    });
    if (previousPurchases > 0)
      return { ok: false, error: "Offre réservée aux nouveaux membres" };
  }

  if (plan.maxPerUser !== null) {
    const count = await db.transaction.count({
      where: {
        userId: args.userId,
        planId: plan.id,
        paymentStatus: "PAID",
      },
    });
    if (count >= plan.maxPerUser)
      return { ok: false, error: "Quota atteint pour cette offre" };
  }

  let priceCents = plan.priceCents;
  let promoCodeId: string | null = null;
  let bonusCredits = 0;
  let promoLabel: string | null = null;
  if (args.promoCode) {
    const evalRes = await evaluatePromoCode(
      args.promoCode,
      args.userId,
      plan.id,
      priceCents
    );
    if (!evalRes.ok) return { ok: false, error: evalRes.error };
    priceCents -= evalRes.promo.discountCents;
    bonusCredits = evalRes.promo.bonusCredits;
    promoCodeId = evalRes.promo.codeId;
    promoLabel = evalRes.promo.code;
  }
  priceCents = Math.max(priceCents, 0);

  if (!stripeEnabled() || priceCents === 0) {
    // Simulated checkout: grant immediately (free or dev mode)
    const result = await grantPlanPurchase({
      userId: user.id,
      planId: plan.id,
      paidCents: priceCents,
      bonusCredits,
      promoCodeId,
      promoLabel,
      stripeRef: null,
    });
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, redirectUrl: args.successUrl };
  }

  // Real Stripe checkout
  const customerId = await createOrGetCustomer({
    userId: user.id,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    existingId: user.stripeCustomerId,
  });
  if (!user.stripeCustomerId) {
    await db.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  const session = await createCheckoutSession({
    customerId,
    priceId: plan.stripePriceId,
    productName: plan.name,
    amountCents: priceCents,
    mode: plan.type === "SUBSCRIPTION" ? "subscription" : "payment",
    successUrl: args.successUrl,
    cancelUrl: args.cancelUrl,
    metadata: {
      userId: user.id,
      planId: plan.id,
      promoCodeId: promoCodeId ?? "",
      bonusCredits: String(bonusCredits),
    },
  });

  // Record a PENDING transaction we'll mark PAID on webhook
  await db.transaction.create({
    data: {
      userId: user.id,
      planId: plan.id,
      type: plan.type === "SUBSCRIPTION" ? "PURCHASE_SUBSCRIPTION" : "PURCHASE_PACK",
      amountCents: priceCents,
      creditsDelta: 0,
      description: `${plan.name}${promoLabel ? ` (promo ${promoLabel})` : ""}`,
      paymentStatus: "PENDING",
      stripeRef: session.id,
    },
  });

  return { ok: true, redirectUrl: session.url };
}

/**
 * Idempotently credit the user. Called either:
 *  - directly (simulated / free checkout)
 *  - from the Stripe webhook on checkout.session.completed
 */
export async function grantPlanPurchase(args: {
  userId: string;
  planId: string;
  paidCents: number;
  bonusCredits?: number;
  promoCodeId?: string | null;
  promoLabel?: string | null;
  stripeRef: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const plan = await db.plan.findUnique({ where: { id: args.planId } });
  if (!plan) return { ok: false, error: "Plan introuvable" };
  const user = await db.user.findUnique({ where: { id: args.userId } });
  if (!user) return { ok: false, error: "Utilisateur introuvable" };

  // Idempotency: if a PAID transaction already exists for this stripeRef, no-op.
  if (args.stripeRef) {
    const already = await db.transaction.findUnique({
      where: { stripeRef: args.stripeRef },
    });
    if (already?.paymentStatus === "PAID") return { ok: true };
  }

  const creditsDelta =
    (plan.type === "CREDIT_PACK" ? plan.creditsAmount ?? 0 : plan.creditsPerCycle ?? 0) +
    (args.bonusCredits ?? 0);

  await db.$transaction(async (tx) => {
    if (args.stripeRef) {
      // Update the PENDING transaction in place
      await tx.transaction.update({
        where: { stripeRef: args.stripeRef },
        data: {
          paymentStatus: "PAID",
          creditsDelta,
        },
      });
    } else {
      await tx.transaction.create({
        data: {
          userId: args.userId,
          planId: args.planId,
          type:
            plan.type === "SUBSCRIPTION"
              ? "PURCHASE_SUBSCRIPTION"
              : "PURCHASE_PACK",
          amountCents: args.paidCents,
          creditsDelta,
          description: `${plan.name}${args.promoLabel ? ` (promo ${args.promoLabel})` : ""}`,
          paymentStatus: args.paidCents === 0 ? "FREE" : "PAID",
        },
      });
    }

    await tx.user.update({
      where: { id: args.userId },
      data: { creditsBalance: { increment: creditsDelta } },
    });

    if (plan.type === "SUBSCRIPTION") {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (plan.intervalDays ?? 30));
      await tx.subscription.create({
        data: {
          userId: args.userId,
          planId: plan.id,
          startDate,
          endDate,
        },
      });
    }
  });

  if (args.promoCodeId) {
    const txRecord = args.stripeRef
      ? await db.transaction.findUnique({ where: { stripeRef: args.stripeRef } })
      : null;
    await recordPromoRedemption(
      args.promoCodeId,
      args.userId,
      txRecord?.id ?? "",
      args.paidCents
    );
  }

  void audit({
    actorId: args.userId,
    action: "PURCHASE",
    entity: "Plan",
    entityId: plan.id,
    metadata: { paidCents: args.paidCents, creditsDelta },
  });

  void sendEmail({
    to: user.email,
    ...emailTemplates.receipt({
      firstName: user.firstName,
      planName: plan.name,
      amountCents: args.paidCents,
      creditsAdded: creditsDelta,
    }),
  });

  return { ok: true };
}
