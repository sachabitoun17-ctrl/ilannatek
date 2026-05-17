import { db } from "./db";
import { audit } from "./audit";
import { sendEmail, emailTemplates } from "./email";
import { getSettings } from "./settings";

export type BookingResult =
  | { ok: true; status: "CONFIRMED" | "WAITLIST"; bookingId: string; position?: number }
  | { ok: false; error: string };

export async function bookSession(
  userId: string,
  sessionId: string
): Promise<BookingResult> {
  const settings = await getSettings();

  const result = await db.$transaction(async (tx) => {
    const session = await tx.session.findUnique({
      where: { id: sessionId },
      include: { classType: true, location: true, instructor: true },
    });
    if (!session) return { ok: false as const, error: "Cours introuvable" };
    if (session.status !== "SCHEDULED")
      return { ok: false as const, error: "Cours non disponible" };
    if (session.startTime < new Date())
      return { ok: false as const, error: "Cours déjà passé" };

    const maxAhead = new Date();
    maxAhead.setDate(maxAhead.getDate() + settings.bookingWindowDays);
    if (session.startTime > maxAhead) {
      return {
        ok: false as const,
        error: `Réservations ouvertes ${settings.bookingWindowDays} jours à l'avance`,
      };
    }

    const existing = await tx.booking.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
    });
    if (existing && existing.status !== "CANCELLED") {
      return { ok: false as const, error: "Vous êtes déjà inscrit à ce cours" };
    }

    const confirmedCount = await tx.booking.count({
      where: { sessionId, status: "CONFIRMED" },
    });
    const waitlistCount = await tx.booking.count({
      where: { sessionId, status: "WAITLIST" },
    });
    const isWaitlist = confirmedCount >= session.capacity;

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) return { ok: false as const, error: "Utilisateur introuvable" };
    if (user.banned) return { ok: false as const, error: "Compte suspendu" };

    const cost = session.classType.creditCost;
    if (!isWaitlist && user.creditsBalance < cost) {
      return {
        ok: false as const,
        error: `Solde insuffisant (${cost} crédit${cost > 1 ? "s" : ""} requis)`,
      };
    }

    let bookingId: string;
    let waitlistPos: number | undefined;

    if (existing) {
      waitlistPos = isWaitlist ? waitlistCount + 1 : undefined;
      const updated = await tx.booking.update({
        where: { id: existing.id },
        data: {
          status: isWaitlist ? "WAITLIST" : "CONFIRMED",
          waitlistPos: isWaitlist ? waitlistPos : null,
          creditsUsed: isWaitlist ? 0 : cost,
          cancelledAt: null,
        },
      });
      bookingId = updated.id;
    } else {
      waitlistPos = isWaitlist ? waitlistCount + 1 : undefined;
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
          paymentStatus: "FREE",
        },
      });
    }

    return {
      ok: true as const,
      status: isWaitlist ? ("WAITLIST" as const) : ("CONFIRMED" as const),
      bookingId,
      position: waitlistPos,
      sessionData: {
        className: session.classType.name,
        startTime: session.startTime,
        location: session.location.name,
        instructor: `${session.instructor.firstName} ${session.instructor.lastName}`,
        userFirstName: user.firstName,
        userEmail: user.email,
      },
    };
  });

  if (result.ok) {
    void audit({
      actorId: userId,
      action: result.status === "CONFIRMED" ? "BOOK_SESSION" : "WAITLIST_SESSION",
      entity: "Booking",
      entityId: result.bookingId,
      metadata: { sessionId },
    });

    const s = result.sessionData!;
    if (result.status === "CONFIRMED") {
      void sendEmail({
        to: s.userEmail,
        ...emailTemplates.bookingConfirmed({
          firstName: s.userFirstName,
          className: s.className,
          startTime: s.startTime,
          location: s.location,
          instructor: s.instructor,
        }),
      });
    } else {
      void sendEmail({
        to: s.userEmail,
        ...emailTemplates.bookingWaitlisted({
          firstName: s.userFirstName,
          className: s.className,
          position: result.position!,
        }),
      });
    }
    return {
      ok: true,
      status: result.status,
      bookingId: result.bookingId,
      position: result.position,
    };
  }
  return result;
}

export async function cancelBooking(
  actorId: string,
  bookingId: string,
  asAdmin = false
): Promise<{ ok: boolean; error?: string }> {
  const settings = await getSettings();

  const result = await db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        session: { include: { classType: true, location: true } },
        user: true,
      },
    });
    if (!booking) return { ok: false as const, error: "Réservation introuvable" };
    if (!asAdmin && booking.userId !== actorId)
      return { ok: false as const, error: "Non autorisé" };
    if (booking.status === "CANCELLED")
      return { ok: false as const, error: "Déjà annulée" };

    const cutoffMin =
      booking.session.cancellationCutoffMin ?? settings.cancellationCutoffMin;
    const msToStart = booking.session.startTime.getTime() - Date.now();
    const isLateCancel = msToStart < cutoffMin * 60 * 1000;
    let feeApplied = 0;

    if (!asAdmin && isLateCancel && msToStart < 0) {
      return { ok: false as const, error: "Cours déjà commencé / passé" };
    }

    const wasConfirmed = booking.status === "CONFIRMED";

    let refundAmount = wasConfirmed ? booking.creditsUsed : 0;
    if (!asAdmin && isLateCancel && wasConfirmed) {
      feeApplied = Math.min(settings.lateCancelFee, refundAmount);
      refundAmount -= feeApplied;
    }

    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
        waitlistPos: null,
        feeApplied,
        cancelledAt: new Date(),
      },
    });

    if (refundAmount > 0) {
      await tx.user.update({
        where: { id: booking.userId },
        data: { creditsBalance: { increment: refundAmount } },
      });
      await tx.transaction.create({
        data: {
          userId: booking.userId,
          type: "CREDIT_REFUND",
          creditsDelta: refundAmount,
          description: `Annulation ${booking.session.classType.name}`,
          paymentStatus: "FREE",
        },
      });
    }

    if (feeApplied > 0) {
      await tx.transaction.create({
        data: {
          userId: booking.userId,
          type: "LATE_CANCEL_FEE",
          creditsDelta: 0,
          description: `Frais annulation tardive (${feeApplied} crédit${feeApplied > 1 ? "s" : ""} retenu${feeApplied > 1 ? "s" : ""})`,
          paymentStatus: "FREE",
        },
      });
    }

    let promotedUser: {
      id: string;
      firstName: string;
      email: string;
      className: string;
      startTime: Date;
    } | null = null;

    if (wasConfirmed) {
      const cost = booking.session.classType.creditCost;

      // Try each waitlisted user in order — skip those with insufficient credits
      const waitlistedAll = await tx.booking.findMany({
        where: { sessionId: booking.sessionId, status: "WAITLIST" },
        orderBy: { waitlistPos: "asc" },
        include: { user: true, session: { include: { classType: true } } },
      });

      for (const candidate of waitlistedAll) {
        if (candidate.user.creditsBalance >= cost) {
          await tx.booking.update({
            where: { id: candidate.id },
            data: {
              status: "CONFIRMED",
              waitlistPos: null,
              creditsUsed: cost,
              promotedFromWaitlistAt: new Date(),
            },
          });
          await tx.user.update({
            where: { id: candidate.userId },
            data: { creditsBalance: { decrement: cost } },
          });
          await tx.transaction.create({
            data: {
              userId: candidate.userId,
              type: "CREDIT_USE",
              creditsDelta: -cost,
              description: `Promotion liste d'attente ${candidate.session.classType.name}`,
              paymentStatus: "FREE",
            },
          });
          promotedUser = {
            id: candidate.userId,
            firstName: candidate.user.firstName,
            email: candidate.user.email,
            className: candidate.session.classType.name,
            startTime: booking.session.startTime,
          };
          break;
        }
      }

      // Reindex remaining waitlist positions
      const remainingWaitlist = await tx.booking.findMany({
        where: { sessionId: booking.sessionId, status: "WAITLIST" },
        orderBy: { waitlistPos: "asc" },
      });
      for (let i = 0; i < remainingWaitlist.length; i++) {
        if (remainingWaitlist[i].waitlistPos !== i + 1) {
          await tx.booking.update({
            where: { id: remainingWaitlist[i].id },
            data: { waitlistPos: i + 1 },
          });
        }
      }
    }

    return {
      ok: true as const,
      bookingUserEmail: booking.user.email,
      bookingUserFirstName: booking.user.firstName,
      className: booking.session.classType.name,
      refundAmount,
      feeApplied,
      promotedUser,
    };
  });

  if (result.ok) {
    void audit({
      actorId,
      action: asAdmin ? "ADMIN_CANCEL_BOOKING" : "CANCEL_BOOKING",
      entity: "Booking",
      entityId: bookingId,
    });
    void sendEmail({
      to: result.bookingUserEmail,
      ...emailTemplates.bookingCancelled({
        firstName: result.bookingUserFirstName,
        className: result.className,
        refunded: result.refundAmount,
        feeApplied: result.feeApplied,
      }),
    });
    if (result.promotedUser) {
      const p = result.promotedUser;
      void sendEmail({
        to: p.email,
        ...emailTemplates.promotedFromWaitlist({
          firstName: p.firstName,
          className: p.className,
          startTime: p.startTime,
        }),
      });
    }
    return { ok: true };
  }
  return result;
}
