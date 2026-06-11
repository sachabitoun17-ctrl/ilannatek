"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { bookSession, cancelBooking } from "@/lib/booking";
import { rateLimit, LIMITS } from "@/lib/rate-limit";

export async function bookAction(sessionId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Veuillez vous connecter" };
  const rl = rateLimit(`book:${user.id}`, LIMITS.BOOKING_PER_USER.max, LIMITS.BOOKING_PER_USER.windowMs);
  if (!rl.allowed) return { ok: false as const, error: "Trop de réservations rapprochées. Patientez un instant." };
  const result = await bookSession(user.id, sessionId);
  revalidatePath("/schedule");
  revalidatePath("/account");
  return result;
}

export async function cancelAction(bookingId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Veuillez vous connecter" };
  const rl = rateLimit(`book:${user.id}`, LIMITS.BOOKING_PER_USER.max, LIMITS.BOOKING_PER_USER.windowMs);
  if (!rl.allowed) return { ok: false as const, error: "Trop d'actions rapprochées. Patientez un instant." };
  const result = await cancelBooking(user.id, bookingId);
  revalidatePath("/schedule");
  revalidatePath("/account");
  return result;
}
