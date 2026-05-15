"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { startCheckout } from "@/lib/checkout";

const schema = z.object({
  planId: z.string().min(1),
  promoCode: z.string().max(40).optional(),
});

function siteUrl() {
  const h = headers();
  const host = h.get("host");
  const proto =
    h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return process.env.NEXT_PUBLIC_SITE_URL ?? `${proto}://${host}`;
}

export async function checkoutPlanAction(formData: FormData) {
  const user = await requireUser();
  const rl = rateLimit(`checkout:${user.id}`, LIMITS.CHECKOUT_PER_USER.max, LIMITS.CHECKOUT_PER_USER.windowMs);
  if (!rl.allowed) {
    return { ok: false as const, error: "Trop de tentatives. Réessayez dans un instant." };
  }
  const parsed = schema.safeParse({
    planId: formData.get("planId"),
    promoCode: formData.get("promoCode") || undefined,
  });
  if (!parsed.success) return { ok: false as const, error: "Données invalides" };

  const base = siteUrl();
  const result = await startCheckout({
    userId: user.id,
    planId: parsed.data.planId,
    promoCode: parsed.data.promoCode,
    successUrl: `${base}/checkout/success?plan=${parsed.data.planId}`,
    cancelUrl: `${base}/checkout/cancel`,
  });
  if (!result.ok) return { ok: false as const, error: result.error };

  revalidatePath("/account");
  redirect(result.redirectUrl);
}
