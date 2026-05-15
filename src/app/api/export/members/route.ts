import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdmin();

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      creditsBalance: true,
      banned: true,
      createdAt: true,
    },
  });

  const rows = [
    ["ID", "Prénom", "Nom", "Email", "Téléphone", "Rôle", "Crédits", "Banni", "Inscrit le"],
    ...users.map((u) => [
      u.id,
      u.firstName,
      u.lastName,
      u.email,
      u.phone ?? "",
      u.role,
      u.creditsBalance,
      u.banned ? "oui" : "non",
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
