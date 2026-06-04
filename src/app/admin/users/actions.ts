"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const adjustCreditsSchema = z.object({
  id: z.string().min(1),
  delta: z.coerce.number().int().refine((v) => v !== 0),
});

const setRoleSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["USER", "INSTRUCTOR", "ADMIN"]),
});

export async function adjustCreditsAction(formData: FormData) {
  await requireAdmin();
  const parsed = adjustCreditsSchema.safeParse({
    id: formData.get("id"),
    delta: formData.get("delta"),
  });
  if (!parsed.success) return;
  const { id, delta } = parsed.data;
  await db.$transaction([
    db.user.update({
      where: { id },
      data: { creditsBalance: { increment: delta } },
    }),
    db.transaction.create({
      data: {
        userId: id,
        type: "ADMIN_ADJUST",
        creditsDelta: delta,
        description: "Ajustement administrateur",
      },
    }),
  ]);
  revalidatePath("/admin/users");
}

export async function setRoleAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = setRoleSchema.safeParse({
    id: formData.get("id"),
    role: formData.get("role"),
  });
  if (!parsed.success) return;
  const { id, role } = parsed.data;
  if (id === admin.id) return;
  await db.user.update({ where: { id }, data: { role } });
  revalidatePath("/admin/users");
}
