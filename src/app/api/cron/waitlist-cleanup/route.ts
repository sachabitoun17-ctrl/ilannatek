import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, emailTemplates } from "@/lib/email";
import { verifyCronAuth } from "@/lib/cronAuth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Waitlist cascade cron — runs every 30 min.
 * Finds expired WaitlistTokens (expiresAt < now, usedAt IS NULL) not yet
 * processed (cascadedAt IS NULL), and offers the freed spot to the next
 * eligible waitlisted member with a fresh 30-minute token.
 *
 * Loop safety:
 *  - every expired token is stamped cascadedAt after processing, so it is
 *    never re-scanned;
 *  - a booking that already received an offer (any WaitlistToken row) is
 *    never offered again — one offer per member per session, no ping-pong;
 *  - offers only go out for future SCHEDULED sessions with free capacity.
 *
 * Call: GET /api/cron/waitlist-cleanup?key=<CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const now = new Date();

  const expiredTokens = await db.waitlistToken.findMany({
    where: {
      expiresAt: { lt: now },
      usedAt: null,
      cascadedAt: null,
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
    // Stamp first: whatever happens below, this token is processed exactly once
    await db.waitlistToken.update({
      where: { id: expiredToken.id },
      data: { cascadedAt: now },
    });

    const session = expiredToken.booking.session;
    const sessionId = expiredToken.booking.sessionId;
    const cost = session.classType.creditCost;

    // No point offering a spot in a past or cancelled session
    if (session.status !== "SCHEDULED" || session.startTime <= now) {
      skipped++;
      continue;
    }

    // The freed spot may have been taken by a direct booking meanwhile
    const confirmedCount = await db.booking.count({
      where: { sessionId, status: "CONFIRMED" },
    });
    if (confirmedCount >= session.capacity) {
      skipped++;
      continue;
    }

    // Walk the waitlist in order, skipping ineligible members, until we find
    // someone who can accept.  "Never offered before" = no token rows ever
    // (one offer per member per session; exhausted offers are cascadedAt-stamped).
    const allCandidates = await db.booking.findMany({
      where: {
        sessionId,
        status: "WAITLIST",
        waitlistTokens: { none: {} },
      },
      orderBy: { waitlistPos: "asc" },
      include: {
        user: true,
        session: { include: { classType: true, location: true } },
      },
    });

    const nextCandidate = allCandidates.find(
      (c) =>
        c.user.creditsBalance >= cost &&
        !(c.user.creditsFrozenUntil && c.user.creditsFrozenUntil > now)
    );

    if (!nextCandidate) {
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
