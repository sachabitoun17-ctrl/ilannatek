import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, emailTemplates } from "@/lib/email";
import { verifyCronAuth } from "@/lib/cronAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sends a "low credits" nudge to members with exactly 1 credit who:
 * - Have attended at least one session in the last 30 days (active members)
 * - Have NOT made a purchase in the last 7 days (avoid nagging right after buy)
 *
 * Run daily. GET /api/cron/low-credits?key=<CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
  const sevenDaysAgo  = new Date(now.getTime() -  7 * 86_400_000);

  const users = await db.user.findMany({
    where: {
      active: true,
      banned: false,
      creditsBalance: 1,
      // Active in the last 30 days
      bookings: {
        some: {
          status: { in: ["CONFIRMED", "ATTENDED"] },
          session: { startTime: { gte: thirtyDaysAgo } },
        },
      },
      // Did NOT purchase in the last 7 days
      transactions: {
        none: {
          type: { in: ["PURCHASE_PACK", "PURCHASE_SUBSCRIPTION"] },
          createdAt: { gte: sevenDaysAgo },
        },
      },
    },
  });

  for (const u of users) {
    void sendEmail({
      to: u.email,
      ...emailTemplates.lowCredits({
        firstName: u.firstName,
        creditsRemaining: u.creditsBalance,
      }),
    });
  }

  return NextResponse.json({ ok: true, sent: users.length });
}
