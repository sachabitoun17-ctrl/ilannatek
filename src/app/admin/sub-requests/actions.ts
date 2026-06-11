"use server";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sendEmail, emailTemplates } from "@/lib/email";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function assignSubAction(sessionId: string, subId: string) {
  const admin = await requireAdmin();

  if (!sessionId || !subId) return { ok: false as const, error: "Données manquantes" };

  const req = await db.subRequest.findUnique({
    where: { sessionId },
    include: {
      session: {
        include: {
          classType: true,
          location: true,
          bookings: {
            where: { status: "CONFIRMED" },
            include: { user: { select: { id: true, email: true, firstName: true } } },
          },
        },
      },
      requester: { select: { firstName: true, lastName: true } },
    },
  });
  if (!req) return { ok: false as const, error: "Demande introuvable" };
  if (req.status !== "OPEN") return { ok: false as const, error: "Cette demande n'est plus ouverte" };

  const sub = await db.user.findUnique({
    where: { id: subId },
    select: { id: true, email: true, firstName: true, lastName: true },
  });
  if (!sub) return { ok: false as const, error: "Instructeur introuvable" };

  // Update sub request + session instructor in one transaction
  await db.$transaction([
    db.subRequest.update({
      where: { sessionId },
      data: { status: "ASSIGNED", subId },
    }),
    db.session.update({
      where: { id: sessionId },
      data: { instructorId: subId },
    }),
  ]);

  void audit({
    actorId: admin.id,
    action: "SUB_ASSIGNED",
    entity: "Session",
    entityId: sessionId,
    metadata: { subId, subName: `${sub.firstName} ${sub.lastName}` },
  });

  const { session } = req;
  const requesterName = `${req.requester.firstName} ${req.requester.lastName}`;
  const newInstructorName = `${sub.firstName} ${sub.lastName}`;

  // Email the substitute
  void sendEmail({
    to: sub.email,
    ...emailTemplates.subAssigned({
      subFirstName: sub.firstName,
      requesterName,
      className: session.classType.name,
      startTime: session.startTime,
      location: session.location.name,
      locationAddress: session.location.address,
      confirmedCount: session.bookings.length,
      capacity: session.capacity,
    }),
  });

  // Email all confirmed members
  for (const booking of session.bookings) {
    void sendEmail({
      to: booking.user.email,
      ...emailTemplates.instructorChanged({
        firstName: booking.user.firstName,
        className: session.classType.name,
        startTime: session.startTime,
        newInstructorName,
      }),
    });
  }

  revalidatePath("/admin/sub-requests");
  revalidatePath("/instructor/sub-requests");
  revalidatePath("/schedule");
  return { ok: true as const };
}
