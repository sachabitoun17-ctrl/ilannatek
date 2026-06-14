"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sendEmail, emailTemplates } from "@/lib/email";

// Parse a "YYYY-MM-DDTHH:MM" datetime-local string as Europe/Paris wall time.
// Without this, new Date("2025-06-10T09:00") is parsed as UTC on Vercel, storing
// 09:00 UTC = 11:00 Paris in summer. We shift the offset to get the correct UTC instant.
function parseParisDatetime(s: string): Date {
  // "2025-06-10T09:00" → Date in Europe/Paris timezone
  const [datePart, timePart] = s.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  // Create a UTC date that represents the Paris wall clock time
  // by using Intl to find the UTC offset for that specific local time.
  const candidate = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const parisStr = candidate.toLocaleString("en-CA", { timeZone: "Europe/Paris", hour12: false });
  // parisStr: "2025-06-10, 11:00:00" — compute the diff
  const [, pTimePart] = parisStr.split(", ");
  const [pH, pM] = pTimePart.split(":").map(Number);
  const offsetMin = (pH * 60 + pM) - (hour * 60 + minute);
  return new Date(candidate.getTime() - offsetMin * 60000);
}

const sessionSchema = z.object({
  classTypeId: z.string().min(1),
  instructorId: z.string().min(1),
  locationId: z.string().min(1),
  startTime: z.string().min(1),
  capacity: z.coerce.number().int().min(1).max(500),
  notes: z.string().optional(),
});

export async function createSessionAction(formData: FormData) {
  const user = await requireAdmin();
  const data = sessionSchema.parse({
    classTypeId: formData.get("classTypeId"),
    instructorId: formData.get("instructorId"),
    locationId: formData.get("locationId"),
    startTime: formData.get("startTime"),
    capacity: formData.get("capacity"),
    notes: formData.get("notes") || undefined,
  });

  const classType = await db.classType.findUnique({
    where: { id: data.classTypeId },
  });
  if (!classType) throw new Error("Type de cours invalide");

  const start = parseParisDatetime(data.startTime);
  const end = new Date(start.getTime() + classType.durationMin * 60000);

  await db.session.create({
    data: {
      classTypeId: data.classTypeId,
      instructorId: data.instructorId,
      locationId: data.locationId,
      startTime: start,
      endTime: end,
      capacity: data.capacity,
      notes: data.notes,
      studioId: user.studioId,
    },
  });
  revalidatePath("/admin/sessions");
  revalidatePath("/schedule");
  redirect("/admin/sessions");
}

export async function updateSessionAction(id: string, formData: FormData) {
  await requireAdmin();
  const data = sessionSchema.parse({
    classTypeId: formData.get("classTypeId"),
    instructorId: formData.get("instructorId"),
    locationId: formData.get("locationId"),
    startTime: formData.get("startTime"),
    capacity: formData.get("capacity"),
    notes: formData.get("notes") || undefined,
  });
  const status = formData.get("status")?.toString() ?? "SCHEDULED";
  if (!["SCHEDULED", "CANCELLED", "COMPLETED"].includes(status)) throw new Error("Statut invalide");

  const classType = await db.classType.findUnique({
    where: { id: data.classTypeId },
  });
  if (!classType) throw new Error("Type de cours invalide");

  const start = parseParisDatetime(data.startTime);
  const end = new Date(start.getTime() + classType.durationMin * 60000);

  const existing = await db.session.findUnique({
    where: { id },
    select: { status: true, classType: { select: { name: true, creditCost: true } }, startTime: true },
  });

  await db.session.update({
    where: { id },
    data: {
      classTypeId: data.classTypeId,
      instructorId: data.instructorId,
      locationId: data.locationId,
      startTime: start,
      endTime: end,
      capacity: data.capacity,
      notes: data.notes,
      status,
    },
  });

  // Notify members when session transitions to CANCELLED
  if (status === "CANCELLED" && existing?.status !== "CANCELLED") {
    await notifySessionCancelled(id, existing?.classType?.name ?? "Séance", existing?.startTime ?? start, existing?.classType?.creditCost ?? 0);
  }

  revalidatePath("/admin/sessions");
  revalidatePath("/schedule");
  redirect("/admin/sessions");
}

export async function deleteSessionAction(id: string) {
  await requireAdmin();
  const session = await db.session.findUnique({
    where: { id },
    select: { status: true, classType: { select: { name: true, creditCost: true } }, startTime: true },
  });
  if (session && session.status !== "CANCELLED") {
    await notifySessionCancelled(id, session.classType?.name ?? "Séance", session.startTime, session.classType?.creditCost ?? 0);
  }
  await db.session.delete({ where: { id } });
  revalidatePath("/admin/sessions");
  revalidatePath("/schedule");
}

async function notifySessionCancelled(sessionId: string, className: string, startTime: Date, _creditCost: number) {
  const bookings = await db.booking.findMany({
    where: { sessionId, status: "CONFIRMED" },
    include: { user: { select: { id: true, email: true, firstName: true } } },
  });

  await db.$transaction([
    db.booking.updateMany({ where: { sessionId, status: { in: ["CONFIRMED", "WAITLIST"] } }, data: { status: "CANCELLED", cancelledAt: new Date() } }),
    // Kill outstanding waitlist offers — the session no longer exists for members
    db.waitlistToken.updateMany({
      where: { booking: { sessionId }, usedAt: null },
      data: { expiresAt: new Date(0) },
    }),
    // Close any open substitution request for this session
    db.subRequest.updateMany({
      where: { sessionId, status: "OPEN" },
      data: { status: "CANCELLED" },
    }),
    // Refund what each member actually paid (creditsUsed, not today's price)
    // with a ledger row per refund — every balance change must be traceable
    ...bookings.filter((b) => b.creditsUsed > 0).flatMap((b) => [
      db.user.update({ where: { id: b.user.id }, data: { creditsBalance: { increment: b.creditsUsed } } }),
      db.transaction.create({
        data: {
          userId: b.user.id,
          type: "CREDIT_REFUND",
          creditsDelta: b.creditsUsed,
          description: `Cours annulé par le studio — ${className}`,
          paymentStatus: "FREE",
        },
      }),
    ]),
  ]);

  for (const b of bookings) {
    void sendEmail({
      to: b.user.email,
      ...emailTemplates.sessionCancelledByStudio({
        firstName: b.user.firstName,
        className,
        startTime,
        creditsRefunded: b.creditsUsed,
      }),
    });
  }
}
