import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/stripe";
import { grantPlanPurchase } from "@/lib/checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();

  const verification = verifyWebhookSignature(raw, sig, secret);
  if (!verification.valid) {
    return NextResponse.json(
      { error: `Invalid signature: ${verification.reason}` },
      { status: 400 }
    );
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as {
        id: string;
        metadata?: Record<string, string>;
        amount_total?: number;
        subscription?: string;
      };
      const userId = session.metadata?.userId;
      const planId = session.metadata?.planId;
      const promoCodeId = session.metadata?.promoCodeId || null;
      const bonusCredits = parseInt(session.metadata?.bonusCredits ?? "0", 10) || 0;
      if (!userId || !planId) {
        return NextResponse.json({ received: true });
      }
      const result = await grantPlanPurchase({
        userId,
        planId,
        paidCents: session.amount_total ?? 0,
        bonusCredits,
        promoCodeId,
        stripeRef: session.id,
      });
      if (!result.ok) {
        console.error("Webhook grant failed:", result.error);
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      if (session.subscription) {
        await db.transaction.update({
          where: { stripeRef: session.id },
          data: { description: { set: undefined } },
        }).catch(() => {});
      }
      break;
    }
    case "invoice.payment_failed": {
      const inv = event.data.object as { customer?: string; subscription?: string };
      if (inv.subscription) {
        await db.subscription.updateMany({
          where: { stripeSubscriptionId: inv.subscription },
          data: { status: "EXPIRED" },
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as { id: string };
      await db.subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { status: "CANCELLED", autoRenew: false },
      });
      break;
    }
    default:
      // ignore other events
      break;
  }

  return NextResponse.json({ received: true });
}
