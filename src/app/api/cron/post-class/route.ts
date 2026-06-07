import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, emailTemplates } from "@/lib/email";
import { verifyCronAuth } from "@/lib/cronAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sends a post-class thank-you email the morning after an attended session.
 * Window: sessions that ended between 22h and 26h ago (covers one run per day).
 * Run daily at 9h. GET /api/cron/post-class?key=<CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const now = new Date();
  const H = 60 * 60 * 1000;
  const windowStart = new Date(now.getTime() - 26 * H);
  const windowEnd   = new Date(now.getTime() - 22 * H);

  const bookings = await db.booking.findMany({
    where: {
      status: "ATTENDED",
      session: {
        endTime: { gte: windowStart, lte: windowEnd },
        status: "SCHEDULED",
      },
    },
    include: {
      user: true,
      session: {
        include: {
          classType: true,
          instructor: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  let sent = 0;

  for (const b of bookings) {
    try {
      const totalAttended = await db.booking.count({
        where: { userId: b.userId, status: "ATTENDED" },
      });

      void sendEmail({
        to: b.user.email,
        ...emailTemplates.postClassThankYou({
          firstName: b.user.firstName,
          className: b.session.classType.name,
          instructor: `${b.session.instructor.firstName} ${b.session.instructor.lastName}`,
          totalAttended,
          creditsRemaining: b.user.creditsBalance,
        }),
      });
      sent++;
    } catch (err) {
      console.error(`[post-class] Failed for booking ${b.id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, sent });
}
