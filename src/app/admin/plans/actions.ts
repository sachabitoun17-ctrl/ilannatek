"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(["CREDIT_PACK", "SUBSCRIPTION"]),
  priceCents: z.coerce.number().int().min(0),
  creditsAmount: z.coerce.number().int().min(0).optional(),
  intervalDays: z.coerce.number().int().min(1).optional(),
  creditsPerCycle: z.coerce.number().int().min(0).optional(),
  description: z.string().optional(),
});

export async function createPlanAction(formData: FormData) {
  await requireAdmin();
  const raw = Object.fromEntries(formData.entries());
  const data = schema.parse({
    name: raw.name,
    type: raw.type,
    priceCents: raw.priceCents,
    creditsAmount: raw.creditsAmount || undefined,
    intervalDays: raw.intervalDays || undefined,
    creditsPerCycle: raw.creditsPerCycle || undefined,
    description: raw.description || undefined,
  });
  await db.plan.create({ data });
  revalidatePath("/packs");
  revalidatePath("/subscriptions");
  redirect("/admin/plans?success=✓ Plan créé");
}

export async function deletePlanAction(id: string) {
  await requireAdmin();
  await db.plan.delete({ where: { id } });
  revalidatePath("/admin/plans");
}

export async function togglePlanAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return;
  const p = await db.plan.findUnique({ where: { id } });
  if (!p) return;
  await db.plan.update({ where: { id }, data: { active: !p.active } });
  revalidatePath("/admin/plans");
  revalidatePath("/packs");
  revalidatePath("/subscriptions");
}
