export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateShort, relativeTime } from "@/lib/utils";
import { RelancerButton } from "./RelancerButton";

/**
 * Churn risk report — three tiers based on recency + credits:
 *   HOT    : last session 14-30d ago, credits ≤ 2
 *   WARM   : last session 30-60d ago, any credits
 *   COLD   : last session > 60d ago (win-back territory)
 *
 * "Last session" = most recent ATTENDED or CONFIRMED booking.
 */

type RiskTier = "HOT" | "WARM" | "COLD";

type AtRiskMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  creditsBalance: number;
  lastSessionDate: Date;
  tier: RiskTier;
  totalAttended: number;
};

function tierLabel(t: RiskTier) {
  switch (t) {
    case "HOT":  return { label: "À risque immédiat", cls: "bg-red-50 text-red-700" };
    case "WARM": return { label: "Risque modéré",     cls: "bg-amber-50 text-amber-700" };
    case "COLD": return { label: "Inactif > 60j",     cls: "bg-stone2-100 text-stone2-500" };
  }
}

export default async function ChurnPage() {
  const now = new Date();
  const ago14  = new Date(now.getTime() - 14  * 86_400_000);
  const ago30  = new Date(now.getTime() - 30  * 86_400_000);
  const ago60  = new Date(now.getTime() - 60  * 86_400_000);
  const ago180 = new Date(now.getTime() - 180 * 86_400_000);

  // Find users with at least one session in the past 6 months but none in the last 14 days
  const users = await db.user.findMany({
    where: {
      active: true,
      banned: false,
      bookings: {
        // Had activity in the last 6 months
        some: {
          status: { in: ["CONFIRMED", "ATTENDED"] },
          session: { startTime: { gte: ago180 } },
        },
        // No activity in the last 14 days
        none: {
          status: { in: ["CONFIRMED", "ATTENDED"] },
          session: { startTime: { gte: ago14 } },
        },
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      creditsBalance: true,
      bookings: {
        where: { status: { in: ["CONFIRMED", "ATTENDED"] } },
        select: { status: true, session: { select: { startTime: true } } },
        orderBy: { session: { startTime: "desc" } },
        take: 1,
      },
      _count: { select: { bookings: { where: { status: "ATTENDED" } } } },
    },
    take: 300,
  });

  const atRisk: AtRiskMember[] = users
    .map((u) => {
      const lastBooking = u.bookings[0];
      if (!lastBooking) return null;
      const lastSessionDate = lastBooking.session.startTime;

      let tier: RiskTier;
      if (lastSessionDate >= ago30 && u.creditsBalance <= 2) {
        tier = "HOT";
      } else if (lastSessionDate < ago30 && lastSessionDate >= ago60) {
        tier = "WARM";
      } else if (lastSessionDate < ago60) {
        tier = "COLD";
      } else {
        // 14-30d but credits > 2 — still worth showing as WARM
        tier = "WARM";
      }

      return {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        creditsBalance: u.creditsBalance,
        lastSessionDate,
        tier,
        totalAttended: u._count.bookings,
      };
    })
    .filter((u): u is AtRiskMember => u !== null)
    .sort((a, b) => {
      const tierOrder = { HOT: 0, WARM: 1, COLD: 2 };
      if (tierOrder[a.tier] !== tierOrder[b.tier]) return tierOrder[a.tier] - tierOrder[b.tier];
      return a.lastSessionDate.getTime() - b.lastSessionDate.getTime();
    });

  const hot  = atRisk.filter((u) => u.tier === "HOT");
  const warm = atRisk.filter((u) => u.tier === "WARM");
  const cold = atRisk.filter((u) => u.tier === "COLD");

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/reports" className="text-sm text-stone2-500 hover:text-brand-600 mb-4 block">
          ← Rapports
        </Link>
        <p className="section-title">Administration · Rapports</p>
        <h1 className="font-serif text-4xl font-medium text-brand-600 mt-1">Risque churn</h1>
        <p className="text-sm text-stone2-500 mt-2 max-w-xl">
          Membres actifs dans les 6 derniers mois mais absents depuis plus de 14 jours.
          Les emails de ré-engagement sont envoyés automatiquement par les crons.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center border-red-200">
          <p className="text-3xl font-serif font-medium text-red-700">{hot.length}</p>
          <p className="text-xs uppercase tracking-widest text-red-500 mt-1">À risque immédiat</p>
          <p className="text-[10px] text-stone2-400 mt-1">14-30j · crédits ≤ 2</p>
        </div>
        <div className="card text-center border-amber-200">
          <p className="text-3xl font-serif font-medium text-amber-700">{warm.length}</p>
          <p className="text-xs uppercase tracking-widest text-amber-500 mt-1">Risque modéré</p>
          <p className="text-[10px] text-stone2-400 mt-1">14-60j sans réservation</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-serif font-medium text-stone2-500">{cold.length}</p>
          <p className="text-xs uppercase tracking-widest text-stone2-400 mt-1">Inactifs &gt; 60j</p>
          <p className="text-[10px] text-stone2-400 mt-1">Win-back en cours</p>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[10px] uppercase tracking-[0.18em] text-stone2-500 border-b border-stone2-100">
            <tr>
              <th className="pb-2">Membre</th>
              <th>Risque</th>
              <th className="hidden sm:table-cell">Dernier cours</th>
              <th className="hidden md:table-cell text-right">Crédits</th>
              <th className="hidden lg:table-cell text-right">Cours suivis</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone2-100">
            {atRisk.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-stone2-400 italic">
                  Aucun membre à risque — belle rétention !
                </td>
              </tr>
            )}
            {atRisk.map((u) => {
              const { label, cls } = tierLabel(u.tier);
              return (
                <tr key={u.id}>
                  <td className="py-2">
                    <Link href={`/admin/users/${u.id}`} className="font-medium hover:text-accent-600 hover:underline">
                      {u.firstName} {u.lastName}
                    </Link>
                    <p className="text-xs text-stone2-400">{u.email}</p>
                  </td>
                  <td>
                    <span className={`badge ${cls}`}>{label}</span>
                  </td>
                  <td className="hidden sm:table-cell text-stone2-600">
                    {relativeTime(u.lastSessionDate)}
                    <br />
                    <span className="text-[10px] text-stone2-400">{formatDateShort(u.lastSessionDate)}</span>
                  </td>
                  <td className={`hidden md:table-cell text-right font-medium ${u.creditsBalance === 0 ? "text-red-600" : u.creditsBalance <= 2 ? "text-amber-600" : "text-brand-600"}`}>
                    {u.creditsBalance}
                  </td>
                  <td className="hidden lg:table-cell text-right text-stone2-600">
                    {u.totalAttended}
                  </td>
                  <td className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      <RelancerButton
                        userId={u.id}
                        firstName={u.firstName}
                        email={u.email}
                        tier={u.tier}
                      />
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="text-xs text-stone2-400 hover:text-brand-600 hover:underline"
                      >
                        Fiche →
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-stone2-400 text-center">
        Les emails de ré-engagement à 14j, 30j et 60j sont envoyés automatiquement par{" "}
        <code className="bg-stone2-50 px-1">/api/cron/reengagement</code>
      </div>
    </div>
  );
}
