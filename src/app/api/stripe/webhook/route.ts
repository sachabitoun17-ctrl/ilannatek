import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/stripe";
import { grantPlanPurchase } from "@/lib/checkout";
import { sendEmail, emailTemplates } from "@/lib/email";

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
        console.error("Webhook checkout.session.completed: missing metadata", { sessionId: session.id, userId, planId });
        return NextResponse.json({ error: "missing metadata" }, { status: 400 });
      }

      const existing = await db.transaction.findUnique({ where: { stripeRef: session.id } });
      if (existing?.paymentStatus === "PAID") {
        return NextResponse.json({ received: true });
      }

      const plan = await db.plan.findUnique({ where: { id: planId } });
      if (plan && session.amount_total != null) {
        const diff = Math.abs((session.amount_total) - plan.priceCents);
        if (diff > 1) {
          console.warn("Webhook amount mismatch", {
            sessionId: session.id,
            webhookAmount: session.amount_total,
            planPriceCents: plan.priceCents,
            diff,
          });
        }
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
      break;
    }
    case "invoice.payment_failed": {
      const inv = event.data.object as { customer?: string; subscription?: string };
      if (inv.subscription) {
        const sub = await db.subscription.findFirst({
          where: { stripeSubscriptionId: inv.subscription },
          include: { user: true, plan: true },
        });
        if (sub) {
          await db.subscription.update({ where: { id: sub.id }, data: { status: "EXPIRED" } });
          void sendEmail({
            to: sub.user.email,
            ...emailTemplates.paymentFailed({ firstName: sub.user.firstName, planName: sub.plan.name }),
          });
        }
      }
      break;
    }
    case "customer.subscription.deleted": {
      const ev = event.data.object as { id: string };
      const sub = await db.subscription.findFirst({
        where: { stripeSubscriptionId: ev.id },
        include: { user: true, plan: true },
      });
      if (sub) {
        await db.subscription.update({ where: { id: sub.id }, data: { status: "CANCELLED", autoRenew: false } });
        void sendEmail({
          to: sub.user.email,
          ...emailTemplates.subscriptionCancelled({ firstName: sub.user.firstName, planName: sub.plan.name }),
        });
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
