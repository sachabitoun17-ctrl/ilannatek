// Minimal Stripe helper.
//
// We intentionally don't depend on the `stripe` npm package to keep the bundle small.
// We hit the REST API directly. Replace with the SDK once you outgrow this.
//
// Required env in production:
//   STRIPE_SECRET_KEY=sk_...
//   STRIPE_WEBHOOK_SECRET=whsec_...
//   NEXT_PUBLIC_SITE_URL=https://your.domain
//
// If STRIPE_SECRET_KEY is not set, the app falls back to a simulated checkout
// (instant credit grant) — useful for local dev.

import crypto from "node:crypto";

const STRIPE_API = "https://api.stripe.com/v1";

export function stripeEnabled() {
  return !!process.env.STRIPE_SECRET_KEY;
}

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
}

function form(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    usp.set(k, String(v));
  }
  return usp.toString();
}

export async function createOrGetCustomer(args: {
  userId: string;
  email: string;
  name: string;
  existingId?: string | null;
}): Promise<string> {
  if (args.existingId) return args.existingId;
  const res = await fetch(`${STRIPE_API}/customers`, {
    method: "POST",
    headers: authHeaders(),
    body: form({
      email: args.email,
      name: args.name,
      "metadata[userId]": args.userId,
    }),
  });
  if (!res.ok) throw new Error(`Stripe customer create failed: ${await res.text()}`);
  const json = await res.json();
  return json.id as string;
}

export async function createCheckoutSession(args: {
  customerId: string;
  priceId?: string | null;
  productName: string;
  amountCents: number;
  mode: "payment" | "subscription";
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}): Promise<{ id: string; url: string }> {
  const params: Record<string, string | number> = {
    customer: args.customerId,
    mode: args.mode,
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
  };
  for (const [k, v] of Object.entries(args.metadata)) {
    params[`metadata[${k}]`] = v;
  }
  if (args.priceId) {
    params["line_items[0][price]"] = args.priceId;
    params["line_items[0][quantity]"] = 1;
  } else {
    // ad-hoc price
    params["line_items[0][price_data][currency]"] = "eur";
    params["line_items[0][price_data][product_data][name]"] = args.productName;
    params["line_items[0][price_data][unit_amount]"] = args.amountCents;
    if (args.mode === "subscription") {
      params["line_items[0][price_data][recurring][interval]"] = "month";
    }
    params["line_items[0][quantity]"] = 1;
  }
  const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: "POST",
    headers: authHeaders(),
    body: form(params),
  });
  if (!res.ok) {
    throw new Error(`Stripe checkout create failed: ${await res.text()}`);
  }
  const json = await res.json();
  return { id: json.id, url: json.url };
}

export async function cancelSubscription(stripeSubscriptionId: string): Promise<void> {
  const res = await fetch(`${STRIPE_API}/subscriptions/${stripeSubscriptionId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const body = await res.text();
    // 404 means already cancelled/deleted — treat as success
    if (res.status !== 404) throw new Error(`Stripe subscription cancel failed: ${body}`);
  }
}

/**
 * Stripe webhook signature verification.
 * Mirrors stripe.webhooks.constructEvent.
 */
export function verifyWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSec = 300
): { valid: boolean; reason?: string } {
  if (!signatureHeader) return { valid: false, reason: "missing signature" };
  const parts = signatureHeader.split(",").map((p) => p.trim().split("="));
  const tsPart = parts.find(([k]) => k === "t");
  const v1Parts = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!tsPart || v1Parts.length === 0) return { valid: false, reason: "malformed signature" };

  const ts = parseInt(tsPart[1], 10);
  if (Number.isNaN(ts)) return { valid: false, reason: "bad timestamp" };
  if (Math.abs(Date.now() / 1000 - ts) > toleranceSec)
    return { valid: false, reason: "timestamp outside tolerance" };

  const signedPayload = `${ts}.${payload}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  const match = v1Parts.some((v) => {
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v));
    } catch {
      return false;
    }
  });
  return match ? { valid: true } : { valid: false, reason: "signature mismatch" };
}
