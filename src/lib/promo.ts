import { db } from "./db";

export type PromoApplication = {
  codeId: string;
  code: string;
  discountCents: number;
  bonusCredits: number;
};

export async function evaluatePromoCode(
  code: string,
  userId: string,
  planId: string,
  basePriceCents: number
): Promise<{ ok: true; promo: PromoApplication } | { ok: false; error: string }> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { ok: false, error: "Code vide" };

  const promo = await db.promoCode.findUnique({ where: { code: trimmed } });
  if (!promo || !promo.active) return { ok: false, error: "Code invalide" };
  if (promo.expiresAt && promo.expiresAt < new Date())
    return { ok: false, error: "Code expiré" };
  if (promo.maxUses !== null && promo.uses >= promo.maxUses)
    return { ok: false, error: "Code épuisé" };

  if (promo.applicablePlanIds) {
    const allowed = promo.applicablePlanIds.split(",").map((s) => s.trim());
    if (!allowed.includes(planId)) {
      return { ok: false, error: "Code non applicable à ce plan" };
    }
  }

  const already = await db.promoRedemption.findUnique({
    where: { codeId_userId: { codeId: promo.id, userId } },
  });
  if (already) return { ok: false, error: "Code déjà utilisé" };

  let discountCents = 0;
  let bonusCredits = 0;
  if (promo.discountType === "PERCENT") {
    discountCents = Math.floor((basePriceCents * promo.discountValue) / 100);
  } else if (promo.discountType === "FIXED_CENTS") {
    discountCents = Math.min(promo.discountValue, basePriceCents);
  } else if (promo.discountType === "FREE_CREDITS") {
    bonusCredits = promo.discountValue;
  }

  return {
    ok: true,
    promo: {
      codeId: promo.id,
      code: promo.code,
      discountCents,
      bonusCredits,
    },
  };
}

export async function recordPromoRedemption(
  codeId: string,
  userId: string,
  transactionId: string,
  appliedAmount: number
) {
  await db.$transaction([
    db.promoRedemption.create({
      data: { codeId, userId, transactionId, appliedAmount },
    }),
    db.promoCode.update({
      where: { id: codeId },
      data: { uses: { increment: 1 } },
    }),
  ]);
}
