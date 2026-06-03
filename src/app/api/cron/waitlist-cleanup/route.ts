import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, emailTemplates } from "@/lib/email";
import { verifyCronAuth } from "@/lib/cronAuth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Waitlist cleanup cron — runs daily.
 * Finds expired WaitlistTokens (expiresAt < now, usedAt IS NULL).
 * For each expired token, promotes the next eligible waitlisted user
 * by creating a fresh 30-minute token and sending them the offer email.
 *
 * Call daily: GET /api/cron/waitlist-cleanup?key=<CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const now = new Date();

  // Find expired, unused tokens
  const expiredTokens = await db.waitlistToken.findMany({
    where: {
      expiresAt: { lt: now },
      usedAt: null,
    },
    include: {
      booking: {
        include: {
          session: {
            include: { classType: true, location: true },
          },
        },
      },
    },
    take: 100,
  });

  let promoted = 0;
  let skipped = 0;

  for (const expiredToken of expiredTokens) {
    const sessionId = expiredToken.booking.sessionId;
    const cost = expiredToken.booking.session.classType.creditCost;

    // Find the next eligible waitlisted user for this session
    // (skip the booking that just timed out — it stays on WAITLIST)
    const nextCandidate = await db.booking.findFirst({
      where: {
        sessionId,
        status: "WAITLIST",
        id: { not: expiredToken.bookingId },
        // Ensure this candidate doesn't already have an active (unused, unexpired) token
        waitlistTokens: {
          none: {
            usedAt: null,
            expiresAt: { gt: now },
          },
        },
      },
      orderBy: { waitlistPos: "asc" },
      include: {
        user: true,
        session: { include: { classType: true, location: true } },
      },
    });

    if (!nextCandidate) {
      skipped++;
      continue;
    }

    if (nextCandidate.user.creditsBalance < cost) {
      skipped++;
      continue;
    }

    // Skip users with frozen credits
    if (
      nextCandidate.user.creditsFrozenUntil &&
      nextCandidate.user.creditsFrozenUntil > now
    ) {
      skipped++;
      continue;
    }

    // Create a fresh 30-min token
    const token = crypto.randomUUID();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);

    await db.waitlistToken.create({
      data: {
        bookingId: nextCandidate.id,
        token,
        expiresAt,
      },
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const acceptUrl = `${siteUrl}/account/waitlist/accept/${token}`;

    void sendEmail({
      to: nextCandidate.user.email,
      ...emailTemplates.waitlistSpotAvailable({
        firstName: nextCandidate.user.firstName,
        className: nextCandidate.session.classType.name,
        startTime: nextCandidate.session.startTime,
        location: nextCandidate.session.location.name,
        acceptUrl,
      }),
    });

    void audit({
      action: "WAITLIST_TOKEN_CASCADE",
      entity: "WaitlistToken",
      metadata: {
        expiredTokenId: expiredToken.id,
        newToken: token,
        sessionId,
        userId: nextCandidate.userId,
      },
    });

    promoted++;
  }

  return NextResponse.json({
    ok: true,
    expiredFound: expiredTokens.length,
    promoted,
    skipped,
  });
}
