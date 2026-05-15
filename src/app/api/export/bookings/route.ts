import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdmin();

  const bookings = await db.booking.findMany({
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      session: {
        include: {
          classType: { select: { name: true } },
          location: { select: { name: true } },
          instructor: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  const rows = [
    ["ID", "Membre", "Email", "Cours", "Studio", "Instructeur", "Début", "Statut", "Crédits utilisés", "Frais", "Créé le"],
    ...bookings.map((b) => [
      b.id,
      `${b.user.firstName} ${b.user.lastName}`,
      b.user.email,
      b.session.classType.name,
      b.session.location.name,
      `${b.session.instructor.firstName} ${b.session.instructor.lastName}`,
      b.session.startTime.toISOString().slice(0, 16).replace("T", " "),
      b.status,
      b.creditsUsed,
      b.feeApplied,
      b.createdAt.toISOString().slice(0, 10),
    ]),
  ];

  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reservations-${today()}.csv"`,
    },
  });
}

function csvCell(v: unknown): string {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
