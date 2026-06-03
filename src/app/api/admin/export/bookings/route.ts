import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

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

export async function GET() {
  await requireAdmin();

  const bookings = await db.booking.findMany({
    orderBy: { createdAt: "desc" },
    take: 10000,
    include: {
      user: { select: { email: true } },
      session: {
        include: {
          classType: { select: { name: true } },
        },
      },
    },
  });

  const rows = [
    ["id", "userId", "userEmail", "sessionId", "sessionDate", "classTypeName", "status", "creditsUsed"],
    ...bookings.map((b) => [
      b.id,
      b.userId,
      b.user.email,
      b.sessionId,
      b.session.startTime.toISOString().slice(0, 16).replace("T", " "),
      b.session.classType.name,
      b.status,
      b.creditsUsed,
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
