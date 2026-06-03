import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, emailTemplates } from "@/lib/email";
import { verifyCronAuth } from "@/lib/cronAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sends a 2-hour reminder email for each confirmed booking whose session starts
 * in the next 1h50–2h10. Run hourly (or at least every few hours): GET /api/cron/reminders2h
 *
 * Idempotency: booking.reminder2hSentAt is set after send so each booking only
 * ever receives one 2h reminder regardless of how often this cron fires.
 */
export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const now = new Date();
  const windowStart = new Date(now.getTime() + (2 * 60 - 10) * 60 * 1000); // now + 1h50
  const windowEnd = new Date(now.getTime() + (2 * 60 + 10) * 60 * 1000);   // now + 2h10

  const bookings = await db.booking.findMany({
    where: {
      status: "CONFIRMED",
      reminder2hSentAt: null,
      session: {
        startTime: { gte: windowStart, lte: windowEnd },
        status: "SCHEDULED",
      },
    },
    include: {
      user: true,
      session: {
        include: { classType: true, location: true },
      },
    },
  });

  let sent = 0;
  for (const b of bookings) {
    try {
      await sendEmail({
        to: b.user.email,
        ...emailTemplates.reminder({
          firstName: b.user.firstName,
          className: b.session.classType.name,
          startTime: b.session.startTime,
          location: b.session.location.name,
        }),
      });
      await db.booking.update({
        where: { id: b.id },
        data: { reminder2hSentAt: new Date() },
      });
      sent++;
    } catch (err) {
      console.error(`[reminders2h] Failed for booking ${b.id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, sent });
}
