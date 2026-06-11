"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getSettings } from "@/lib/settings";
import { sendEmail, emailTemplates } from "@/lib/email";

export async function markAttendanceAction(
  bookingId: string,
  status: "ATTENDED" | "NO_SHOW" | "CONFIRMED"
) {
  const me = await requireStaff();
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { session: { include: { classType: true } }, user: true },
  });
  if (!booking) return { ok: false as const, error: "Réservation introuvable" };
  if (me.role !== "ADMIN" && booking.session.instructorId !== me.id) {
    return { ok: false as const, error: "Non autorisé" };
  }

  const settings = await getSettings();
  let newBalance: number | null = null;

  let feeAlreadyApplied = false;
  await db.$transaction(async (tx) => {
    // Atomic: only apply the fee if WE transition the status (concurrent double-click
    // on "Absent" would otherwise charge the fee twice).
    const claim = await tx.booking.updateMany({
      where: { id: bookingId, status: { not: status } },
      data: { status },
    });
    if (claim.count === 0) {
      feeAlreadyApplied = true;
      return;
    }

    if (status === "NO_SHOW" && booking.status !== "NO_SHOW" && settings.noShowFee > 0) {
      // Re-read balance inside tx; cap fee so balance never goes negative
      const freshUser = await tx.user.findUnique({ where: { id: booking.userId }, select: { creditsBalance: true } });
      const fee = Math.min(settings.noShowFee, freshUser?.creditsBalance ?? 0);
      if (fee > 0) {
        const updated = await tx.user.update({
          where: { id: booking.userId },
          data: { creditsBalance: { decrement: fee } },
          select: { creditsBalance: true },
        });
        newBalance = updated.creditsBalance;
        await tx.transaction.create({
          data: {
            userId: booking.userId,
            type: "NO_SHOW_FEE",
            creditsDelta: -fee,
            description: `Frais d'absence — ${booking.session.classType.name}`,
            paymentStatus: "FREE",
          },
        });
      }
    }
  });

  // Email notification for no-show fee
  if (!feeAlreadyApplied && status === "NO_SHOW" && booking.status !== "NO_SHOW" && settings.noShowFee > 0 && newBalance !== null) {
    void sendEmail({
      to: booking.user.email,
      ...emailTemplates.noShowFee({
        firstName: booking.user.firstName,
        className: booking.session.classType.name,
        fee: settings.noShowFee,
        newBalance,
      }),
    });
  }

  void audit({
    actorId: me.id,
    action: `ATTENDANCE_${status}`,
    entity: "Booking",
    entityId: bookingId,
  });

  revalidatePath(`/instructor/sessions/${booking.sessionId}`);
  revalidatePath("/admin/sessions");
  return { ok: true as const };
}
