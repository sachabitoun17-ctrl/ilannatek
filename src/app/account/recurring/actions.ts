"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Add a new recurring slot for the current user.
 * classTypeId  — the class type to auto-book
 * dayOfWeek    — 0=Sunday … 6=Saturday
 * startTimeMin — minutes from midnight (e.g. 7*60 = 420 for 07:00)
 * locationId   — optional location filter
 */
export async function addRecurringSlot(
  classTypeId: string,
  dayOfWeek: number,
  startTimeMin: number,
  locationId?: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Non authentifié" };

  try {
    await db.recurringSlot.upsert({
      where: {
        userId_classTypeId_dayOfWeek_startTimeMin: {
          userId: user.id,
          classTypeId,
          dayOfWeek,
          startTimeMin,
        },
      },
      update: { active: true, locationId: locationId ?? null },
      create: {
        userId: user.id,
        classTypeId,
        dayOfWeek,
        startTimeMin,
        locationId: locationId ?? null,
        active: true,
      },
    });
    revalidatePath("/account/recurring");
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible d'ajouter le créneau" };
  }
}

/**
 * Deactivate a recurring slot (soft delete).
 */
export async function removeRecurringSlot(
  slotId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Non authentifié" };

  const slot = await db.recurringSlot.findUnique({ where: { id: slotId } });
  if (!slot) return { ok: false, error: "Créneau introuvable" };
  if (slot.userId !== user.id) return { ok: false, error: "Non autorisé" };

  await db.recurringSlot.update({
    where: { id: slotId },
    data: { active: false },
  });
  revalidatePath("/account/recurring");
  return { ok: true };
}
