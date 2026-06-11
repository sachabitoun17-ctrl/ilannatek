"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { cancelBooking } from "@/lib/booking";
import { markAttendanceAction } from "@/app/instructor/sessions/[id]/actions";

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
  // Same guarded path as instructors: atomic claim, no-show fee, email, audit.
  // A bare status update here would skip the fee an instructor would charge.
  const result = await markAttendanceAction(bookingId, status);
  revalidatePath("/admin/sessions");
  return result;
}
