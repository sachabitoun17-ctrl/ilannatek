import { db } from "./db";

export type BookingResult =
  | { ok: true; status: "CONFIRMED" | "WAITLIST"; bookingId: string; position?: number }
  | { ok: false; error: string };

export async function bookSession(
  userId: string,
  sessionId: string
): Promise<BookingResult> {
  return db.$transaction(async (tx) => {
    // Lock the session row to prevent concurrent over-booking
    const session = await tx.session.findUnique({
      where: { id: sessionId },
      include: { classType: true },
    });
    if (!session) return { ok: false as const, error: "Cours introuvable" };
    if (session.status !== "SCHEDULED")
      return { ok: false as const, error: "Cours non disponible" };
    if (session.startTime < new Date())
      return { ok: false as const, error: "Cours déjà passé" };

    const existing = await tx.booking.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
    });
    if (existing && existing.status !== "CANCELLED") {
      return { ok: false as const, error: "Vous êtes déjà inscrit à ce cours" };
    }

    // Count confirmed seats inside the transaction to avoid race conditions
    const confirmedCount = await tx.booking.count({
      where: { sessionId, status: "CONFIRMED" },
    });
    const waitlistCount = await tx.booking.count({
      where: { sessionId, status: "WAITLIST" },
    });
    const isWaitlist = confirmedCount >= session.capacity;

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) return { ok: false as const, error: "Utilisateur introuvable" };

    const cost = session.classType.creditCost;

    if (!isWaitlist) {
      if (user.creditsBalance < cost) {
        return {
          ok: false as const,
          error: `Solde insuffisant (${cost} crédits requis)`,
        };
      }
    }

    let bookingId: string;
    let waitlistPos: number | undefined;

    if (existing) {
      const updateData: {
        status: string;
        waitlistPos?: number | null;
        creditsUsed: number;
      } = {
        status: isWaitlist ? "WAITLIST" : "CONFIRMED",
        creditsUsed: isWaitlist ? 0 : cost,
      };
      if (isWaitlist) {
        waitlistPos = waitlistCount + 1;
        updateData.waitlistPos = waitlistPos;
      } else {
        updateData.waitlistPos = null;
      }
      const updated = await tx.booking.update({
        where: { id: existing.id },
        data: updateData,
      });
      bookingId = updated.id;
    } else {
      if (isWaitlist) {
        waitlistPos = waitlistCount + 1;
      }
      const created = await tx.booking.create({
        data: {
          sessionId,
          userId,
          status: isWaitlist ? "WAITLIST" : "CONFIRMED",
          waitlistPos: isWaitlist ? waitlistPos : null,
          creditsUsed: isWaitlist ? 0 : cost,
        },
      });
      bookingId = created.id;
    }

    if (!isWaitlist) {
      await tx.user.update({
        where: { id: userId },
        data: { creditsBalance: { decrement: cost } },
      });
      await tx.transaction.create({
        data: {
          userId,
          type: "CREDIT_USE",
          creditsDelta: -cost,
          description: `Réservation ${session.classType.name}`,
        },
      });
    }

    return {
      ok: true as const,
      status: isWaitlist ? ("WAITLIST" as const) : ("CONFIRMED" as const),
      bookingId,
      position: waitlistPos,
    };
  });
}

export async function cancelBooking(
  userId: string,
  bookingId: string,
  asAdmin = false
): Promise<{ ok: boolean; error?: string }> {
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { session: { include: { classType: true } } },
    });
    if (!booking) return { ok: false as const, error: "Réservation introuvable" };
    if (!asAdmin && booking.userId !== userId)
      return { ok: false as const, error: "Non autorisé" };
    if (booking.status === "CANCELLED")
      return { ok: false as const, error: "Déjà annulée" };

    // Cancellation cutoff: members cannot cancel within 2h of session start
    const CANCEL_CUTOFF_MS = 2 * 60 * 60 * 1000;
    if (!asAdmin && booking.session.startTime.getTime() - Date.now() < CANCEL_CUTOFF_MS) {
      return {
        ok: false as const,
        error: "Annulation impossible moins de 2h avant le cours",
      };
    }

    const wasConfirmed = booking.status === "CONFIRMED";

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED", waitlistPos: null },
    });

    if (wasConfirmed && booking.creditsUsed > 0) {
      await tx.user.update({
        where: { id: booking.userId },
        data: { creditsBalance: { increment: booking.creditsUsed } },
      });
      await tx.transaction.create({
        data: {
          userId: booking.userId,
          type: "CREDIT_REFUND",
          creditsDelta: booking.creditsUsed,
          description: `Annulation ${booking.session.classType.name}`,
        },
      });
    }

    if (wasConfirmed) {
      const nextWaitlisted = await tx.booking.findFirst({
        where: {
          sessionId: booking.sessionId,
          status: "WAITLIST",
        },
        orderBy: { waitlistPos: "asc" },
        include: { user: true, session: { include: { classType: true } } },
      });
      if (nextWaitlisted) {
        const cost = nextWaitlisted.session.classType.creditCost;
        if (nextWaitlisted.user.creditsBalance >= cost) {
          await tx.booking.update({
            where: { id: nextWaitlisted.id },
            data: {
              status: "CONFIRMED",
              waitlistPos: null,
              creditsUsed: cost,
            },
          });
          await tx.user.update({
            where: { id: nextWaitlisted.userId },
            data: { creditsBalance: { decrement: cost } },
          });
          await tx.transaction.create({
            data: {
              userId: nextWaitlisted.userId,
              type: "CREDIT_USE",
              creditsDelta: -cost,
              description: `Promotion depuis liste d'attente ${nextWaitlisted.session.classType.name}`,
            },
          });
        }
      }

      const remainingWaitlist = await tx.booking.findMany({
        where: { sessionId: booking.sessionId, status: "WAITLIST" },
        orderBy: { waitlistPos: "asc" },
      });
      for (let i = 0; i < remainingWaitlist.length; i++) {
        await tx.booking.update({
          where: { id: remainingWaitlist[i].id },
          data: { waitlistPos: i + 1 },
        });
      }
    }

    return { ok: true as const };
  });
}
