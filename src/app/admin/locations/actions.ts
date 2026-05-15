"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
});

export async function createLocationAction(formData: FormData) {
  await requireAdmin();
  const data = schema.parse({
    name: formData.get("name"),
    address: formData.get("address") || undefined,
  });
  await db.location.create({ data });
  revalidatePath("/admin/locations");
}

export async function deleteLocationAction(id: string) {
  await requireAdmin();
  await db.location.delete({ where: { id } });
  revalidatePath("/admin/locations");
}
