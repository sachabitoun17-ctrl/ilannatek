import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdmin();

  const transactions = await db.transaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 10000,
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      plan: { select: { name: true } },
    },
  });

  const rows = [
    ["ID", "Membre", "Email", "Type", "Plan", "Montant (€)", "Crédits", "Statut paiement", "Stripe ref", "Date"],
    ...transactions.map((t) => [
      t.id,
      `${t.user.firstName} ${t.user.lastName}`,
      t.user.email,
      t.type,
      t.plan?.name ?? "",
      (t.amountCents / 100).toFixed(2),
      t.creditsDelta,
      t.paymentStatus,
      t.stripeRef ?? "",
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
