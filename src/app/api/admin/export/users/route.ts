import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = String(v ?? "");
  // Prefix with ' to prevent formula injection in Excel/Sheets
  const safe = /^[=+\-@|]/.test(s) ? `'${s}` : s;
  if (safe.includes(",") || safe.includes('"') || safe.includes("\n")) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET() {
  await requireAdmin();

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      creditsBalance: true,
      createdAt: true,
    },
  });

  const rows = [
    ["id", "email", "firstName", "lastName", "phone", "role", "creditsBalance", "createdAt"],
    ...users.map((u) => [
      u.id,
      u.email,
      u.firstName,
      u.lastName,
      u.phone ?? "",
      u.role,
      u.creditsBalance,
      u.createdAt.toISOString().slice(0, 10),
    ]),
  ];

  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="membres-${today()}.csv"`,
    },
  });
}
