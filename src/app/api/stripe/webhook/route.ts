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
        return NextResponse.json({ received: true });
      }
      const result = await grantPlanPurchase({
        userId,
        planId,
        paidCents: session.amount_total ?? 0,
        bonusCredits,
        promoCodeId,
        stripeRef: session.id,
        stripeSubscriptionId: session.subscription ?? null,
      });
      if (!result.ok) {
        console.error("Webhook grant failed:", result.error);
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      break;
    }
    case "invoice.payment_succeeded": {
      // Stripe-billed subscription renewal: extend the local period and grant
      // the cycle's credits. The FIRST invoice (billing_reason=subscription_create)
      // is already handled by checkout.session.completed — skip it here.
      const inv = event.data.object as {
        id: string;
        subscription?: string;
        billing_reason?: string;
        amount_paid?: number;
      };
      if (!inv.subscription || inv.billing_reason === "subscription_create") break;

      const sub = await db.subscription.findFirst({
        where: { stripeSubscriptionId: inv.subscription },
        include: { user: true, plan: true },
      });
      if (!sub) {
        console.error(`[webhook] invoice.payment_succeeded: no local subscription for ${inv.subscription}`);
        break;
      }

      const credits = sub.plan.creditsPerCycle ?? 0;
      const base = sub.endDate > new Date() ? sub.endDate : new Date();
      const newEnd = new Date(base);
      newEnd.setDate(newEnd.getDate() + (sub.plan.intervalDays ?? 30));

      try {
        // stripeRef unique on Transaction = idempotency: a redelivered invoice
        // event throws P2002 on the create and grants nothing twice.
        await db.$transaction([
          db.transaction.create({
            data: {
              userId: sub.userId,
              planId: sub.planId,
              type: "PURCHASE_SUBSCRIPTION",
              amountCents: inv.amount_paid ?? sub.plan.priceCents,
              creditsDelta: credits,
              description: `Renouvellement ${sub.plan.name}`,
              paymentStatus: "PAID",
              stripeRef: inv.id,
            },
          }),
          db.subscription.update({
            where: { id: sub.id },
            data: { endDate: newEnd, status: "ACTIVE" },
          }),
          db.user.update({
            where: { id: sub.userId },
            data: { creditsBalance: { increment: credits } },
          }),
        ]);
        void sendEmail({
          to: sub.user.email,
          ...emailTemplates.receipt({
            firstName: sub.user.firstName,
            planName: `${sub.plan.name} (renouvellement)`,
            amountCents: inv.amount_paid ?? sub.plan.priceCents,
            creditsAdded: credits,
          }),
        });
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        if (code !== "P2002") throw err; // P2002 = duplicate delivery, already granted
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
      // ignore other events
      break;
  }

  return NextResponse.json({ received: true });
}
