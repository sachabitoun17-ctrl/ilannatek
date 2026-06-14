"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

const schema = z.object({
  accountName: z.string().min(2, "Nom du client trop court"),
  plan: z.enum(["STARTER", "PRO", "SCALE"]),
  contactEmail: z.string().email("Email invalide").optional().or(z.literal("")),
  studioName: z.string().min(2, "Nom du studio trop court"),
  studioSlug: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  adminEmail: z.string().email("Email admin invalide"),
  adminPassword: z.string().min(8, "Mot de passe : 8 caractères minimum"),
  adminFirstName: z.string().min(1, "Prénom requis"),
  adminLastName: z.string().min(1, "Nom requis"),
});

export type CreateClientState = { error?: string; fieldErrors?: Record<string, string> };

export async function createStudioClient(
  _prev: CreateClientState,
  formData: FormData,
): Promise<CreateClientState> {
  await requireSuperAdmin();

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const issue of parsed.error.issues) fe[issue.path[0] as string] = issue.message;
    return { error: "Vérifiez les champs.", fieldErrors: fe };
  }
  const d = parsed.data;

  const accountSlug = slugify(d.accountName);
  const studioSlug = d.studioSlug ? slugify(d.studioSlug) : slugify(d.studioName);

  if (!studioSlug) return { error: "Slug du studio invalide." };

  // Unicité
  const [slugTaken, emailTaken] = await Promise.all([
    db.studio.findUnique({ where: { slug: studioSlug }, select: { id: true } }),
    db.user.findUnique({ where: { email: d.adminEmail.toLowerCase() }, select: { id: true } }),
  ]);
  if (slugTaken) return { error: `Le slug « ${studioSlug} » est déjà utilisé.`, fieldErrors: { studioSlug: "Déjà pris" } };
  if (emailTaken) return { error: "Cet email admin existe déjà.", fieldErrors: { adminEmail: "Déjà utilisé" } };

  const passwordHash = await bcrypt.hash(d.adminPassword, 10);

  const studio = await db.$transaction(async (tx) => {
    // Slug de compte unique (suffixe si collision)
    let finalAccountSlug = accountSlug || studioSlug;
    let n = 1;
    while (await tx.account.findUnique({ where: { slug: finalAccountSlug }, select: { id: true } })) {
      finalAccountSlug = `${accountSlug}-${++n}`;
    }

    const account = await tx.account.create({
      data: {
        name: d.accountName,
        slug: finalAccountSlug,
        plan: d.plan,
        status: "ACTIVE",
        contactEmail: d.contactEmail || null,
      },
    });

    const newStudio = await tx.studio.create({
      data: {
        accountId: account.id,
        name: d.studioName,
        slug: studioSlug,
        city: d.city || null,
        status: "ACTIVE",
      },
    });

    await tx.user.create({
      data: {
        email: d.adminEmail.toLowerCase(),
        passwordHash,
        firstName: d.adminFirstName,
        lastName: d.adminLastName,
        role: "ADMIN",
        creditsBalance: 0,
        studioId: newStudio.id,
      },
    });

    return newStudio;
  });

  revalidatePath("/superadmin");
  redirect(`/superadmin?created=${studio.slug}`);
}
