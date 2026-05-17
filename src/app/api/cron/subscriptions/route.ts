import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sendEmail, emailTemplates } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Cron entry point for subscription lifecycle.
 * Call hourly: GET /api/cron/subscriptions?key=<CRON_SECRET>
 *
 * Behavior:
 *  - Subscriptions past their endDate without autoRenew → mark EXPIRED
 *  - Subscriptions past their endDate WITH autoRenew → if linked to Stripe
 *    subscription, do nothing (Stripe drives it via webhooks). Otherwise
 *    renew locally: extend endDate by intervalDays and grant new credits.
 */
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const expected = process.env.CRON_SECRET;
  if (!expected || key !== expected) return unauthorized();

  const now = new Date();

  // Send expiry warning 3 days before endDate (window: 3d to 2d from now)
  const warnFrom = new Date(now.getTime() + 2 * 86400000);
  const warnTo = new Date(now.getTime() + 3 * 86400000);
  const expiringSoon = await db.subscription.findMany({
    where: { status: "ACTIVE", endDate: { gte: warnFrom, lte: warnTo }, autoRenew: false },
    include: { plan: true, user: true },
    take: 200,
  });
  for (const sub of expiringSoon) {
    const daysLeft = Math.ceil((sub.endDate.getTime() - now.getTime()) / 86400000);
    void sendEmail({
      to: sub.user.email,
      ...emailTemplates.subscriptionExpiringSoon({
        firstName: sub.user.firstName,
        planName: sub.plan.name,
        endDate: sub.endDate,
        daysLeft,
      }),
    });
  }

  const due = await db.subscription.findMany({
    where: { status: "ACTIVE", endDate: { lte: now } },
    include: { plan: true, user: true },
    take: 200,
  });

  let renewed = 0;
  let expired = 0;
  for (const sub of due) {
    if (sub.stripeSubscriptionId) {
      // Trust Stripe to renew this via its own webhook
      continue;
    }
    if (!sub.autoRenew) {
      await db.subscription.update({
        where: { id: sub.id },
        data: { status: "EXPIRED" },
      });
      expired++;
      continue;
    }
    // Local renewal (no Stripe): grant another cycle's credits
    const newEnd = new Date(sub.endDate);
    newEnd.setDate(newEnd.getDate() + (sub.plan.intervalDays ?? 30));
    const credits = sub.plan.creditsPerCycle ?? 0;

    await db.$transaction([
      db.subscription.update({
        where: { id: sub.id },
        data: { endDate: newEnd },
      }),
      db.user.update({
        where: { id: sub.userId },
        data: { creditsBalance: { increment: credits } },
      }),
      db.transaction.create({
        data: {
          userId: sub.userId,
          planId: sub.planId,
          type: "PURCHASE_SUBSCRIPTION",
          amountCents: sub.plan.priceCents,
          creditsDelta: credits,
          description: `Renouvellement automatique ${sub.plan.name}`,
          paymentStatus: "FREE", // marked FREE because no real charge happened
        },
      }),
    ]);
    void sendEmail({
      to: sub.user.email,
      ...emailTemplates.receipt({
        firstName: sub.user.firstName,
        planName: `${sub.plan.name} (renouvellement)`,
        amountCents: sub.plan.priceCents,
        creditsAdded: credits,
      }),
    });
    renewed++;
  }

  void audit({
    action: "CRON_SUBSCRIPTIONS",
    metadata: { renewed, expired, considered: due.length, warningSent: expiringSoon.length },
  });

  return NextResponse.json({ ok: true, renewed, expired, considered: due.length, warningSent: expiringSoon.length });
}
