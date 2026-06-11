"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function adjustCreditsAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = formData.get("id")?.toString();
  const delta = parseInt(formData.get("delta")?.toString() ?? "0", 10);
  if (!id || Number.isNaN(delta) || delta === 0) return;
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
  void audit({
    actorId: admin.id,
    action: "ADJUST_CREDITS",
    entity: "User",
    entityId: id,
    metadata: { delta },
  });
  revalidatePath("/admin/users");
}

export async function setRoleAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = formData.get("id")?.toString();
  const role = formData.get("role")?.toString();
  if (!id || !role || !["USER", "INSTRUCTOR", "ADMIN"].includes(role)) return;
  await db.user.update({ where: { id }, data: { role } });
  void audit({
    actorId: admin.id,
    action: "SET_ROLE",
    entity: "User",
    entityId: id,
    metadata: { role },
  });
  revalidatePath("/admin/users");
}
