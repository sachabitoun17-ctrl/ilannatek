"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { bookSession, cancelBooking } from "@/lib/booking";

export async function bookAction(sessionId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Veuillez vous connecter" };
  const result = await bookSession(user.id, sessionId);
  revalidatePath("/schedule");
  revalidatePath("/account");
  return result;
}

export async function cancelAction(bookingId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Veuillez vous connecter" };
  const result = await cancelBooking(user.id, bookingId);
  revalidatePath("/schedule");
  revalidatePath("/account");
  return result;
}
