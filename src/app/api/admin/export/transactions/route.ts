import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = String(v ?? "");
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

  const transactions = await db.transaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 10000,
    include: {
      user: { select: { email: true } },
    },
  });

  const rows = [
    ["id", "userId", "userEmail", "type", "amountCents", "creditsDelta", "description", "paymentStatus", "createdAt"],
    ...transactions.map((t) => [
      t.id,
      t.userId,
      t.user.email,
      t.type,
      t.amountCents,
      t.creditsDelta,
      t.description ?? "",
      t.paymentStatus,
      t.createdAt.toISOString().slice(0, 16).replace("T", " "),
    ]),
  ];

  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="transactions-${today()}.csv"`,
    },
  });
}
