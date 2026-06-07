import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, emailTemplates } from "@/lib/email";
import { verifyCronAuth } from "@/lib/cronAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MILESTONES = [5, 10, 25, 50, 100, 200];

/**
 * Sends a milestone celebration email when a member just crossed 5/10/25/50/100/200 courses.
 * Detects members whose N-th booking was attended in the last 25h.
 * Run daily. GET /api/cron/milestones?key=<CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const now = new Date();
  const yesterday = new Date(now.getTime() - 25 * 60 * 60 * 1000);

  // Find users who attended a session in the last 25h
  const recentBookings = await db.booking.findMany({
    where: {
      status: "ATTENDED",
      session: { startTime: { gte: yesterday, lte: now } },
    },
    select: { userId: true },
    distinct: ["userId"],
  });

  if (recentBookings.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const userIds = recentBookings.map((b) => b.userId);
  let sent = 0;

  for (const userId of userIds) {
    const [user, total] = await Promise.all([
      db.user.findUnique({ where: { id: userId } }),
      db.booking.count({ where: { userId, status: "ATTENDED" } }),
    ]);

    if (!user || !MILESTONES.includes(total)) continue;

    void sendEmail({
      to: user.email,
      ...emailTemplates.streakMilestone({
        firstName: user.firstName,
        totalCourses: total,
      }),
    });
    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
