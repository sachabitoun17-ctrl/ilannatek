import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, emailTemplates } from "@/lib/email";
import { verifyCronAuth } from "@/lib/cronAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sends a reminder email for each confirmed booking whose session starts in
 * the next 24-26h. Call hourly: GET /api/cron/reminders?key=<CRON_SECRET>
 *
 * Idempotency: each user gets at most one reminder per booking (we rely on the
 * hourly window 24-25h being narrow, which avoids duplicates if cron is hourly).
 */
export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const now = new Date();
  const start = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const bookings = await db.booking.findMany({
    where: {
      status: "CONFIRMED",
      session: { startTime: { gte: start, lte: end }, status: "SCHEDULED" },
    },
    include: {
      user: true,
      session: {
        include: { classType: true, location: true },
      },
    },
  });

  for (const b of bookings) {
    void sendEmail({
      to: b.user.email,
      ...emailTemplates.reminder({
        firstName: b.user.firstName,
        className: b.session.classType.name,
        startTime: b.session.startTime,
        location: b.session.location.name,
      }),
    });
  }

  return NextResponse.json({ ok: true, sent: bookings.length });
}
