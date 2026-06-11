"use server";

import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { sendEmail, emailTemplates } from "@/lib/email";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function requestSubAction(sessionId: string, reason: string | null) {
  const user = await requireStaff();

  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: {
      classType: true,
      location: true,
      bookings: { where: { status: "CONFIRMED" } },
    },
  });
  if (!session) return { ok: false as const, error: "Séance introuvable" };
  if (session.instructorId !== user.id && user.role !== "ADMIN") {
    return { ok: false as const, error: "Accès refusé" };
  }
  if (session.startTime < new Date()) {
    return { ok: false as const, error: "Cette séance est déjà passée" };
  }

  const existing = await db.subRequest.findUnique({ where: { sessionId } });
  if (existing && existing.status === "OPEN") {
    return { ok: false as const, error: "Une demande est déjà en cours pour cette séance" };
  }
  if (existing && existing.status === "ASSIGNED") {
    return { ok: false as const, error: "Un remplaçant a déjà été assigné" };
  }

  await db.subRequest.upsert({
    where: { sessionId },
    create: { sessionId, requesterId: user.id, reason: reason || null, status: "OPEN" },
    update: { requesterId: user.id, reason: reason || null, status: "OPEN", subId: null },
  });

  void audit({
    actorId: user.id,
    action: "SUB_REQUEST_CREATED",
    entity: "Session",
    entityId: sessionId,
    metadata: { reason },
  });

  // Notify all admins
  const admins = await db.user.findMany({
    where: { role: "ADMIN", active: true },
    select: { email: true },
  });
  for (const admin of admins) {
    void sendEmail({
      to: admin.email,
      ...emailTemplates.subRequestedToAdmin({
        requesterName: `${user.firstName} ${user.lastName}`,
        className: session.classType.name,
        startTime: session.startTime,
        location: session.location.name,
        reason: reason || null,
        confirmedCount: session.bookings.length,
      }),
    });
  }

  revalidatePath("/instructor/sub-requests");
  revalidatePath("/admin/sub-requests");
  return { ok: true as const };
}

export async function cancelSubRequestAction(sessionId: string) {
  const user = await requireStaff();

  const req = await db.subRequest.findUnique({ where: { sessionId } });
  if (!req) return { ok: false as const, error: "Demande introuvable" };
  if (req.requesterId !== user.id && user.role !== "ADMIN") {
    return { ok: false as const, error: "Accès refusé" };
  }
  if (req.status !== "OPEN") {
    return { ok: false as const, error: "Cette demande ne peut plus être annulée" };
  }

  await db.subRequest.update({ where: { sessionId }, data: { status: "CANCELLED" } });

  void audit({
    actorId: user.id,
    action: "SUB_REQUEST_CANCELLED",
    entity: "Session",
    entityId: sessionId,
  });

  revalidatePath("/instructor/sub-requests");
  revalidatePath("/admin/sub-requests");
  return { ok: true as const };
}
