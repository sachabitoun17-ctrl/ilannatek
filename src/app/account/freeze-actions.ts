"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function freezeCredits(weeks: number) {
  const user = await requireUser();

  const frozenUntil = new Date(Date.now() + weeks * 7 * 24 * 60 * 60 * 1000);

  await db.user.update({
    where: { id: user.id },
    data: { creditsFrozenUntil: frozenUntil },
  });

  void audit({
    actorId: user.id,
    action: "FREEZE_CREDITS",
    entity: "User",
    entityId: user.id,
    metadata: { weeks, frozenUntil: frozenUntil.toISOString() },
  });

  revalidatePath("/account");
}

export async function unfreezeCredits() {
  const user = await requireUser();

  await db.user.update({
    where: { id: user.id },
    data: { creditsFrozenUntil: null },
  });

  void audit({
    actorId: user.id,
    action: "UNFREEZE_CREDITS",
    entity: "User",
    entityId: user.id,
  });

  revalidatePath("/account");
}
