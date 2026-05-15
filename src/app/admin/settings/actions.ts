"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { updateSettings } from "@/lib/settings";
import { audit } from "@/lib/audit";

const schema = z.object({
  studioName: z.string().min(1).max(100),
  cancellationCutoffMin: z.coerce.number().int().min(0).max(60 * 24 * 30),
  lateCancelFee: z.coerce.number().int().min(0).max(100),
  noShowFee: z.coerce.number().int().min(0).max(100),
  bookingWindowDays: z.coerce.number().int().min(1).max(365),
  welcomeCredits: z.coerce.number().int().min(0).max(1000),
  emailFrom: z.string().email(),
  stripePublishableKey: z.string().optional(),
});

export async function updateSettingsAction(formData: FormData) {
  const admin = await requireAdmin();
  const data = schema.parse(Object.fromEntries(formData.entries()));
  await updateSettings({
    studioName: data.studioName,
    cancellationCutoffMin: data.cancellationCutoffMin,
    lateCancelFee: data.lateCancelFee,
    noShowFee: data.noShowFee,
    bookingWindowDays: data.bookingWindowDays,
    welcomeCredits: data.welcomeCredits,
    emailFrom: data.emailFrom,
    stripePublishableKey: data.stripePublishableKey || null,
  });
  await audit({
    actorId: admin.id,
    action: "UPDATE_SETTINGS",
    metadata: data,
  });
  redirect("/admin/settings?success=✓ Paramètres enregistrés");
}
