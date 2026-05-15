"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { cancelBooking } from "@/lib/booking";

export async function adminCancelBookingAction(bookingId: string) {
  const admin = await requireAdmin();
  const result = await cancelBooking(admin.id, bookingId, true);
  revalidatePath("/admin/sessions");
  return result;
}

export async function adminMarkAttendanceAction(
  bookingId: string,
  status: "ATTENDED" | "NO_SHOW"
) {
  await requireAdmin();
  await db.booking.update({ where: { id: bookingId }, data: { status } });
  revalidatePath("/admin/sessions");
}
