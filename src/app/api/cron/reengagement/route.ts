import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, emailTemplates } from "@/lib/email";
import { verifyCronAuth } from "@/lib/cronAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Re-engagement drip based on days since last confirmed/attended session.
 *   14d window (13–15d ago) → reengagement14d
 *   30d window (29–31d ago) → reengagement30d
 *   60d window (59–61d ago) → winBack60d
 *
 * Each window is 2 days wide so running daily never double-sends.
 * Run daily. GET /api/cron/reengagement?key=<CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const now = new Date();
  const DAY = 86_400_000;

  const groups = [
    { label: "14d", from: new Date(now.getTime() - 15 * DAY), to: new Date(now.getTime() - 13 * DAY) },
    { label: "30d", from: new Date(now.getTime() - 31 * DAY), to: new Date(now.getTime() - 29 * DAY) },
    { label: "60d", from: new Date(now.getTime() - 61 * DAY), to: new Date(now.getTime() - 59 * DAY) },
  ] as const;

  const counts: Record<string, number> = { "14d": 0, "30d": 0, "60d": 0 };

  for (const { label, from, to } of groups) {
    // Users whose last booking falls within this window and have no more recent booking
    const users = await db.user.findMany({
      where: {
        active: true,
        banned: false,
        bookings: {
          some: {
            status: { in: ["CONFIRMED", "ATTENDED"] },
            session: { startTime: { gte: from, lte: to } },
          },
          none: {
            status: { in: ["CONFIRMED", "ATTENDED"] },
            session: { startTime: { gt: to } },
          },
        },
      },
    });

    for (const u of users) {
      if (label === "14d") {
        const next = await db.session.findFirst({
          where: { startTime: { gt: now }, status: "SCHEDULED" },
          orderBy: { startTime: "asc" },
          include: { classType: true, location: true },
        });
        void sendEmail({
          to: u.email,
          ...emailTemplates.reengagement14d({
            firstName: u.firstName,
            creditsBalance: u.creditsBalance,
            nextClassName: next?.classType.name ?? null,
            nextStartTime: next?.startTime ?? null,
            nextLocation: next?.location.name ?? null,
          }),
        });
      } else if (label === "30d") {
        void sendEmail({
          to: u.email,
          ...emailTemplates.reengagement30d({
            firstName: u.firstName,
            creditsBalance: u.creditsBalance,
          }),
        });
      } else {
        void sendEmail({
          to: u.email,
          ...emailTemplates.winBack60d({ firstName: u.firstName, promoCode: null }),
        });
      }
      counts[label]++;
    }
  }

  return NextResponse.json({ ok: true, ...counts });
}
