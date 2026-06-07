import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, emailTemplates } from "@/lib/email";
import { verifyCronAuth } from "@/lib/cronAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Onboarding drip: nudge members who registered but haven't booked yet.
 * D+1 window: registered 20–28h ago, 0 bookings → onboardingNudge
 * D+3 window: registered 68–76h ago, 0 bookings → onboardingLastCall
 * Run daily. GET /api/cron/onboarding-drip?key=<CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const now = new Date();
  const H = 60 * 60 * 1000;

  const d1Start = new Date(now.getTime() - 28 * H);
  const d1End   = new Date(now.getTime() - 20 * H);
  const d3Start = new Date(now.getTime() - 76 * H);
  const d3End   = new Date(now.getTime() - 68 * H);

  const [day1Users, day3Users] = await Promise.all([
    db.user.findMany({
      where: {
        active: true,
        banned: false,
        createdAt: { gte: d1Start, lte: d1End },
        bookings: { none: {} },
      },
    }),
    db.user.findMany({
      where: {
        active: true,
        banned: false,
        createdAt: { gte: d3Start, lte: d3End },
        bookings: { none: {} },
      },
    }),
  ]);

  let sent = 0;

  for (const u of day1Users) {
    void sendEmail({
      to: u.email,
      ...emailTemplates.onboardingNudge({
        firstName: u.firstName,
        creditsBalance: u.creditsBalance,
      }),
    });
    sent++;
  }

  for (const u of day3Users) {
    void sendEmail({
      to: u.email,
      ...emailTemplates.onboardingLastCall({ firstName: u.firstName }),
    });
    sent++;
  }

  return NextResponse.json({ ok: true, sent, day1: day1Users.length, day3: day3Users.length });
}
