"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  durationMin: z.coerce.number().int().min(5).max(360),
  creditCost: z.coerce.number().int().min(0).max(100),
  color: z.string().default("#ec4899"),
});

export async function createClassTypeAction(formData: FormData) {
  const user = await requireAdmin();
  const data = schema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    durationMin: formData.get("durationMin"),
    creditCost: formData.get("creditCost"),
    color: formData.get("color") || "#ec4899",
  });
  await db.classType.create({ data: { ...data, studioId: user.studioId } });
  redirect("/admin/class-types?success=✓ Type de cours créé");
}

export async function deleteClassTypeAction(id: string) {
  await requireAdmin();
  await db.classType.delete({ where: { id } });
  revalidatePath("/admin/class-types");
}
