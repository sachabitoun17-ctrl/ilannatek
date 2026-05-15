"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function selfCheckInAction(formData: FormData) {
  const user = await requireUser();
  const sessionId = formData.get("sessionId")?.toString();
  if (!sessionId) return;

  const session = await db.session.findUnique({ where: { id: sessionId } });
  if (!session) return;

  // Allow self check-in only in the [start-15min, start+90min] window
  const now = Date.now();
  const start = session.startTime.getTime();
  if (now < start - 15 * 60_000 || now > start + 90 * 60_000) return;

  const booking = await db.booking.findUnique({
    where: { sessionId_userId: { sessionId, userId: user.id } },
  });
  if (!booking || booking.status !== "CONFIRMED") return;

  await db.$transaction([
    db.booking.update({
      where: { id: booking.id },
      data: { status: "ATTENDED" },
    }),
    db.checkIn.upsert({
      where: { sessionId_userId: { sessionId, userId: user.id } },
      update: { source: "SELF" },
      create: { sessionId, userId: user.id, source: "SELF" },
    }),
  ]);

  void audit({
    actorId: user.id,
    action: "SELF_CHECKIN",
    entity: "Booking",
    entityId: booking.id,
  });

  revalidatePath(`/check-in/${sessionId}`);
  revalidatePath("/account");
}
