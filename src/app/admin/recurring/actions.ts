"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";

const schema = z.object({
  classTypeId: z.string().min(1),
  instructorId: z.string().min(1),
  locationId: z.string().min(1),
  daysOfWeek: z.array(z.string()).min(1, "Au moins un jour"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  capacity: z.coerce.number().int().min(1).max(500),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export async function createRecurringAction(formData: FormData) {
  const admin = await requireAdmin();
  const days = formData.getAll("daysOfWeek").map((v) => v.toString());
  const data = schema.parse({
    classTypeId: formData.get("classTypeId"),
    instructorId: formData.get("instructorId"),
    locationId: formData.get("locationId"),
    daysOfWeek: days,
    startTime: formData.get("startTime"),
    capacity: formData.get("capacity"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });

  const ct = await db.classType.findUnique({ where: { id: data.classTypeId } });
  if (!ct) return;

  const [hh, mm] = data.startTime.split(":").map((s) => parseInt(s, 10));
  const startMin = hh * 60 + mm;
  const dayNumbers = new Set(data.daysOfWeek.map((d) => parseInt(d, 10)));

  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  end.setHours(23, 59, 59, 999);

  const rule = await db.recurringRule.create({
    data: {
      classTypeId: data.classTypeId,
      instructorId: data.instructorId,
      locationId: data.locationId,
      daysOfWeek: Array.from(dayNumbers).sort().join(","),
      startTimeMin: startMin,
      capacity: data.capacity,
      startDate: start,
      endDate: end,
      studioId: admin.studioId,
    },
  });

  let created = 0;
  for (
    let cursor = new Date(start);
    cursor <= end;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    if (!dayNumbers.has(cursor.getDay())) continue;
    const sessionStart = new Date(cursor);
    sessionStart.setHours(hh, mm, 0, 0);
    const sessionEnd = new Date(sessionStart.getTime() + ct.durationMin * 60000);
    await db.session.create({
      data: {
        classTypeId: data.classTypeId,
        instructorId: data.instructorId,
        locationId: data.locationId,
        startTime: sessionStart,
        endTime: sessionEnd,
        capacity: data.capacity,
        recurringRuleId: rule.id,
        studioId: admin.studioId,
      },
    });
    created++;
  }

  await audit({
    actorId: admin.id,
    action: "CREATE_RECURRING",
    entity: "RecurringRule",
    entityId: rule.id,
    metadata: { created, days: Array.from(dayNumbers) },
  });

  revalidatePath("/admin/sessions");
  revalidatePath("/schedule");
  redirect("/admin/sessions");
}
