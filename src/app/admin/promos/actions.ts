"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";

const schema = z.object({
  code: z.string().min(2).max(40),
  discountType: z.enum(["PERCENT", "FIXED_CENTS", "FREE_CREDITS"]),
  discountValue: z.coerce.number().int().min(1),
  maxUses: z.coerce.number().int().min(1).optional(),
  expiresAt: z.string().optional(),
  description: z.string().max(200).optional(),
});

export async function createPromoAction(formData: FormData) {
  const admin = await requireAdmin();
  const raw = Object.fromEntries(formData.entries());
  const data = schema.parse({
    ...raw,
    maxUses: raw.maxUses || undefined,
    expiresAt: raw.expiresAt || undefined,
    description: raw.description || undefined,
  });
  await db.promoCode.create({
    data: {
      code: data.code.trim().toUpperCase(),
      discountType: data.discountType,
      discountValue: data.discountValue,
      maxUses: data.maxUses,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      description: data.description,
    },
  });
  await audit({
    actorId: admin.id,
    action: "CREATE_PROMO",
    metadata: { code: data.code },
  });
  revalidatePath("/admin/promos");
}

export async function togglePromoAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return;
  const p = await db.promoCode.findUnique({ where: { id } });
  if (!p) return;
  await db.promoCode.update({ where: { id }, data: { active: !p.active } });
  revalidatePath("/admin/promos");
}

export async function deletePromoAction(id: string) {
  await requireAdmin();
  await db.promoCode.delete({ where: { id } });
  revalidatePath("/admin/promos");
}
