"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, requireAdmin } from "@/lib/auth";

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  bio: z.string().optional(),
});

export async function createInstructorAction(formData: FormData) {
  await requireAdmin();
  const data = schema.parse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    bio: formData.get("bio") || undefined,
  });
  const exists = await db.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });
  if (exists) {
    await db.user.update({
      where: { id: exists.id },
      data: { role: "INSTRUCTOR", instructorBio: data.bio ?? exists.instructorBio },
    });
  } else {
    await db.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: await hashPassword(data.password),
        firstName: data.firstName,
        lastName: data.lastName,
        role: "INSTRUCTOR",
        instructorBio: data.bio,
      },
    });
  }
  redirect("/admin/instructors?success=✓ Instructeur créé");
}

export async function toggleInstructorRoleAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return;
  const user = await db.user.findUnique({ where: { id } });
  if (!user) return;
  const next =
    user.role === "INSTRUCTOR"
      ? "USER"
      : user.role === "USER"
      ? "INSTRUCTOR"
      : "INSTRUCTOR";
  await db.user.update({ where: { id }, data: { role: next } });
  revalidatePath("/admin/instructors");
}
