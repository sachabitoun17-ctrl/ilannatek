import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { retryOutboxEmail } from "@/lib/email";
import { verifyCronAuth } from "@/lib/cronAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 5;

/**
 * Retries failed transactional emails persisted in EmailOutbox.
 * Run every 15 min: GET /api/cron/email-retry?key=<CRON_SECRET>
 *
 * Backoff: nextRetryAt = now + 5min * 2^attempts (5m, 10m, 20m, 40m).
 * After MAX_ATTEMPTS the email is marked FAILED and left for manual review.
 */
export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ ok: true, skipped: "no email provider configured" });
  }

  const now = new Date();
  const pending = await db.emailOutbox.findMany({
    where: { status: "PENDING", nextRetryAt: { lte: now }, attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  let sent = 0;
  let failed = 0;

  for (const email of pending) {
    // Atomic claim: a concurrent cron run skips emails another run already picked up
    const claim = await db.emailOutbox.updateMany({
      where: { id: email.id, status: "PENDING", attempts: email.attempts },
      data: { attempts: { increment: 1 } },
    });
    if (claim.count === 0) continue;

    try {
      await retryOutboxEmail({
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text ?? undefined,
      });
      await db.emailOutbox.update({
        where: { id: email.id },
        data: { status: "SENT", sentAt: new Date() },
      });
      sent++;
    } catch (err) {
      const attempts = email.attempts + 1;
      const exhausted = attempts >= MAX_ATTEMPTS;
      await db.emailOutbox.update({
        where: { id: email.id },
        data: {
          status: exhausted ? "FAILED" : "PENDING",
          lastError: String(err).slice(0, 1000),
          nextRetryAt: new Date(Date.now() + 5 * 60 * 1000 * Math.pow(2, attempts)),
        },
      });
      failed++;
      if (exhausted) {
        console.error(`[email-retry] Email ${email.id} to ${email.to} permanently failed after ${attempts} attempts`);
      }
    }
  }

  return NextResponse.json({ ok: true, processed: pending.length, sent, failed });
}
