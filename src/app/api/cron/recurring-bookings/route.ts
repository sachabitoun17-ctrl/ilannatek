import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookSession } from "@/lib/booking";
import { verifyCronAuth } from "@/lib/cronAuth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Recurring-bookings cron — runs daily.
 * For each active RecurringSlot, looks for sessions in the next 7–14 days
 * matching (classTypeId, dayOfWeek, startTimeMin ± 30 min, locationId if set).
 * If found and the user has no existing booking, calls bookSession().
 * Skips users with frozen credits (bookSession handles this check already).
 *
 * Call daily: GET /api/cron/recurring-bookings?key=<CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const now = new Date();
  const windowStart = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const activeSlots = await db.recurringSlot.findMany({
    where: { active: true },
    include: {
      user: { select: { id: true, creditsFrozenUntil: true } },
      classType: { select: { id: true } },
    },
    take: 500,
  });

  let booked = 0;
  let skipped = 0;
  let errors = 0;

  for (const slot of activeSlots) {
    const user = slot.user;

    // Skip frozen credits users early (bookSession would catch it too, but no need to waste queries)
    if (user.creditsFrozenUntil && user.creditsFrozenUntil > now) {
      skipped++;
      continue;
    }

    // Time window: ±30 min around startTimeMin (in minutes from midnight)
    const toleranceMin = 30;
    const minTime = slot.startTimeMin - toleranceMin;
    const maxTime = slot.startTimeMin + toleranceMin;

    // Find sessions in the 7–14 day window matching the slot
    const candidateSessions = await db.session.findMany({
      where: {
        classTypeId: slot.classTypeId,
        ...(slot.locationId ? { locationId: slot.locationId } : {}),
        status: "SCHEDULED",
        startTime: { gte: windowStart, lte: windowEnd },
        // Filter out past sessions (redundant but safe)
        // We'll filter dayOfWeek and time in-memory since Prisma doesn't expose DOW/minutes natively
      },
      select: { id: true, startTime: true, locationId: true },
    });

    for (const session of candidateSessions) {
      const startTime = session.startTime;
      const sessionDayOfWeek = startTime.getDay(); // 0=Sunday … 6=Saturday
      const sessionMinutes = startTime.getHours() * 60 + startTime.getMinutes();

      // Check day of week matches
      if (sessionDayOfWeek !== slot.dayOfWeek) continue;

      // Check time is within ±30 min
      if (sessionMinutes < minTime || sessionMinutes > maxTime) continue;

      // Check if user already has a non-cancelled booking for this session
      const existingBooking = await db.booking.findUnique({
        where: {
          sessionId_userId: {
            sessionId: session.id,
            userId: user.id,
          },
        },
        select: { status: true },
      });

      if (existingBooking && existingBooking.status !== "CANCELLED") {
        skipped++;
        continue;
      }

      // Auto-book
      try {
        const result = await bookSession(user.id, session.id);
        if (result.ok) {
          void audit({
            actorId: user.id,
            action: "RECURRING_AUTO_BOOK",
            entity: "Booking",
            entityId: result.bookingId,
            metadata: {
              slotId: slot.id,
              sessionId: session.id,
              status: result.status,
            },
          });
          booked++;
        } else {
          // Non-fatal: e.g. insufficient credits, booking window not open yet
          skipped++;
        }
      } catch {
        errors++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    slotsConsidered: activeSlots.length,
    booked,
    skipped,
    errors,
  });
}
