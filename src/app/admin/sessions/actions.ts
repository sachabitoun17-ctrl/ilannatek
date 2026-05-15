"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const sessionSchema = z.object({
  classTypeId: z.string().min(1),
  instructorId: z.string().min(1),
  locationId: z.string().min(1),
  startTime: z.string().min(1),
  capacity: z.coerce.number().int().min(1).max(500),
  notes: z.string().optional(),
});

export async function createSessionAction(formData: FormData) {
  await requireAdmin();
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

  const start = new Date(data.startTime);
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

  const classType = await db.classType.findUnique({
    where: { id: data.classTypeId },
  });
  if (!classType) throw new Error("Type de cours invalide");

  const start = new Date(data.startTime);
  const end = new Date(start.getTime() + classType.durationMin * 60000);

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
  revalidatePath("/admin/sessions");
  revalidatePath("/schedule");
  redirect("/admin/sessions");
}

export async function deleteSessionAction(id: string) {
  await requireAdmin();
  await db.session.delete({ where: { id } });
  revalidatePath("/admin/sessions");
  revalidatePath("/schedule");
}
