"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getSettings } from "@/lib/settings";

export async function markAttendanceAction(
  bookingId: string,
  status: "ATTENDED" | "NO_SHOW" | "CONFIRMED"
) {
  const me = await requireStaff();
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { session: true, user: true },
  });
  if (!booking) return { ok: false as const, error: "Réservation introuvable" };
  if (me.role !== "ADMIN" && booking.session.instructorId !== me.id) {
    return { ok: false as const, error: "Non autorisé" };
  }

  const settings = await getSettings();
  await db.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: { status },
    });

    // Apply no-show fee
    if (status === "NO_SHOW" && booking.status !== "NO_SHOW" && settings.noShowFee > 0) {
      const fee = settings.noShowFee;
      await tx.user.update({
        where: { id: booking.userId },
        data: { creditsBalance: { decrement: fee } },
      });
      await tx.transaction.create({
        data: {
          userId: booking.userId,
          type: "NO_SHOW_FEE",
          creditsDelta: -fee,
          description: "Frais d'absence non excusée",
          paymentStatus: "FREE",
        },
      });
    }
  });

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
