import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { RevenueChart } from "./RevenueChart";
import { BookingsChart } from "./BookingsChart";

export default async function ReportsPage() {
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const startYTD = new Date(now.getFullYear(), 0, 1);
  const ago30 = new Date(Date.now() - 30 * 86400000);
  const ago14 = new Date(Date.now() - 14 * 86400000);

  const [
    revenueThisMonth,
    revenueLastMonth,
    revenueYTD,
    // All-time totals for avg credit value
    creditsEconomy,
    // Credits consumed this month (negative delta)
    creditsConsumedMonth,
    creditsConsumedLastMonth,
    // Liability: credits still in wallets
    totalCreditsInCirculation,
    // Operations
    bookingsLast30,
    cancelLast30,
    noShowLast30,
    activeSubs,
    newUsersLast30,
    // Tables
    topInstructors,
    topClassTypes,
    // Charts
    monthlyRevenue,
    monthlyConsumed,
    dailyBookings,
    // Fill rate
    sessionsLast30,
  ] = await Promise.all([
    // ── Cash received ────────────────────────────────────────────
    db.transaction.aggregate({
      _sum: { amountCents: true },
      where: { paymentStatus: "PAID", createdAt: { gte: startMonth } },
    }),
    db.transaction.aggregate({
      _sum: { amountCents: true },
      where: { paymentStatus: "PAID", createdAt: { gte: startLastMonth, lte: endLastMonth } },
    }),
    db.transaction.aggregate({
      _sum: { amountCents: true },
      where: { paymentStatus: "PAID", createdAt: { gte: startYTD } },
    }),
    // ── Credit economics (all time) ──────────────────────────────
    db.transaction.aggregate({
      _sum: { amountCents: true, creditsDelta: true },
      where: { paymentStatus: "PAID", creditsDelta: { gt: 0 } },
    }),
    // ── Credits consumed this month ──────────────────────────────
    db.transaction.aggregate({
      _sum: { creditsDelta: true },
      where: { type: "CREDIT_USE", createdAt: { gte: startMonth } },
    }),
    db.transaction.aggregate({
      _sum: { creditsDelta: true },
      where: { type: "CREDIT_USE", createdAt: { gte: startLastMonth, lte: endLastMonth } },
    }),
    // ── Liability: credits in wallets ────────────────────────────
    db.user.aggregate({ _sum: { creditsBalance: true } }),
    // ── Operations ───────────────────────────────────────────────
    db.booking.count({ where: { createdAt: { gte: ago30 } } }),
    db.booking.count({ where: { status: "CANCELLED", cancelledAt: { gte: ago30 } } }),
    db.booking.count({ where: { status: "NO_SHOW", updatedAt: { gte: ago30 } } }),
    db.subscription.count({ where: { status: "ACTIVE", endDate: { gt: now } } }),
    db.user.count({ where: { createdAt: { gte: ago30 } } }),
    // ── Top tables ───────────────────────────────────────────────
    db.$queryRawUnsafe<{ instructorId: string; firstName: string; lastName: string; n: bigint }[]>(
      `SELECT s."instructorId", u."firstName", u."lastName", COUNT(b.id)::int as n
       FROM "Booking" b
       JOIN "Session" s ON s.id = b."sessionId"
       JOIN "User" u ON u.id = s."instructorId"
       WHERE b.status IN ('CONFIRMED', 'ATTENDED')
         AND b."createdAt" >= NOW() - INTERVAL '30 days'
       GROUP BY s."instructorId", u."firstName", u."lastName"
       ORDER BY n DESC LIMIT 5`
    ),
    db.$queryRawUnsafe<{ classTypeId: string; name: string; n: bigint; cap: bigint }[]>(
      `SELECT s."classTypeId", ct.name, COUNT(b.id)::int as n, SUM(s.capacity)::int as cap
       FROM "Booking" b
       JOIN "Session" s ON s.id = b."sessionId"
       JOIN "ClassType" ct ON ct.id = s."classTypeId"
       WHERE b.status IN ('CONFIRMED', 'ATTENDED')
         AND s."startTime" >= NOW() - INTERVAL '30 days'
       GROUP BY s."classTypeId", ct.name
       ORDER BY n DESC LIMIT 5`
    ),
    // ── Charts ───────────────────────────────────────────────────
    db.$queryRawUnsafe<{ month: string; revenue: bigint }[]>(
      `SELECT TO_CHAR("createdAt", 'YYYY-MM') as month, SUM("amountCents")::bigint as revenue
       FROM "Transaction"
       WHERE "paymentStatus" = 'PAID'
         AND "createdAt" >= NOW() - INTERVAL '12 months'
       GROUP BY month ORDER BY month ASC`
    ),
    db.$queryRawUnsafe<{ month: string; consumed: bigint }[]>(
      `SELECT TO_CHAR("createdAt", 'YYYY-MM') as month, ABS(SUM("creditsDelta"))::bigint as consumed
       FROM "Transaction"
       WHERE type = 'CREDIT_USE'
         AND "createdAt" >= NOW() - INTERVAL '12 months'
       GROUP BY month ORDER BY month ASC`
    ),
    db.$queryRawUnsafe<{ day: string; bookings: bigint; cancels: bigint }[]>(
      `SELECT
         TO_CHAR(DATE("createdAt"), 'YYYY-MM-DD') as day,
         COUNT(CASE WHEN status IN ('CONFIRMED','ATTENDED','WAITLIST') THEN 1 END)::int as bookings,
         COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END)::int as cancels
       FROM "Booking"
       WHERE "createdAt" >= NOW() - INTERVAL '14 days'
       GROUP BY day ORDER BY day ASC`
    ),
    db.session.findMany({
      where: { startTime: { gte: ago30, lte: now }, status: "SCHEDULED", capacity: { gt: 0 } },
      select: {
        capacity: true,
        bookings: { where: { status: { in: ["CONFIRMED", "ATTENDED"] } }, select: { id: true } },
      },
    }),
  ]);

  // ── Derived financials ───────────────────────────────────────────────────────

  const rev = revenueThisMonth._sum.amountCents ?? 0;
  const revPrev = revenueLastMonth._sum.amountCents ?? 0;
  const revYTD = revenueYTD._sum.amountCents ?? 0;
  const revTrend = revPrev > 0 ? Math.round(((rev - revPrev) / revPrev) * 100) : null;

  // Average credit value in cents
  const totalRevAllTime = creditsEconomy._sum.amountCents ?? 0;
  const totalCreditsGranted = creditsEconomy._sum.creditsDelta ?? 1; // guard div/0
  const avgCreditValueCents = totalCreditsGranted > 0
    ? Math.round(totalRevAllTime / totalCreditsGranted)
    : 0;

  // CA réalisé = credits consumed × avg credit value
  const creditsConsumedThisMonthN = Math.abs(creditsConsumedMonth._sum.creditsDelta ?? 0);
  const creditsConsumedLastMonthN = Math.abs(creditsConsumedLastMonth._sum.creditsDelta ?? 0);
  const caRealiseMonth = creditsConsumedThisMonthN * avgCreditValueCents;
  const caRealisePrev = creditsConsumedLastMonthN * avgCreditValueCents;
  const caRealiseTrend = caRealisePrev > 0
    ? Math.round(((caRealiseMonth - caRealisePrev) / caRealisePrev) * 100)
    : null;

  // Produits constatés d'avance (liability)
  const creditsInCirculation = totalCreditsInCirculation._sum.creditsBalance ?? 0;
  const pcaCents = creditsInCirculation * avgCreditValueCents;

  // Average fill rate
  const fillRate = sessionsLast30.length > 0
    ? Math.round(
        sessionsLast30.reduce((acc, s) => acc + s.bookings.length / s.capacity, 0) /
        sessionsLast30.length * 100
      )
    : null;

  // ── Chart data ───────────────────────────────────────────────────────────────

  const consumedMap = new Map(monthlyConsumed.map((r) => [r.month, Number(r.consumed)]));
  const revenueChartData = monthlyRevenue.map((r) => ({
    month: r.month.slice(5), // "MM"
    encaisse: Number(r.revenue),
    realise: Math.round((consumedMap.get(r.month) ?? 0) * avgCreditValueCents),
  }));

  const bookingsChartData = dailyBookings.map((r) => ({
    day: r.day.slice(5),
    bookings: Number(r.bookings),
    cancels: Number(r.cancels),
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-title">Administration</p>
          <h1 className="font-serif text-4xl md:text-5xl font-medium text-brand-600 mt-0.5 leading-none">
            Dashboard
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/export/transactions" className="btn-secondary text-xs">↓ Transactions</a>
          <a href="/api/export/bookings" className="btn-secondary text-xs">↓ Réservations</a>
          <a href="/api/export/members" className="btn-secondary text-xs">↓ Membres</a>
        </div>
      </div>

      {/* ── Section Encaissements ──────────────────────────────────────────── */}
      <section>
        <SectionLabel>Encaissements (CA cash)</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Stat
            label="CA mois en cours"
            value={formatPrice(rev)}
            hint={revTrend !== null ? `${revTrend >= 0 ? "+" : ""}${revTrend}% vs mois précédent` : undefined}
            hintPositive={revTrend !== null && revTrend >= 0}
          />
          <Stat label="CA mois précédent" value={formatPrice(revPrev)} />
          <Stat label={`CA ${now.getFullYear()}`} value={formatPrice(revYTD)} muted />
        </div>
      </section>

      {/* ── Section Économique ────────────────────────────────────────────── */}
      <section>
        <SectionLabel accent>Économique (crédits)</SectionLabel>
        <p className="text-xs text-stone2-400 mb-3 max-w-2xl">
          Le CA réalisé correspond aux crédits effectivement consommés en séance, valorisés au prix moyen d'un crédit.
          Les <em>produits constatés d'avance</em> sont les crédits encore en circulation — un engagement envers les membres.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat
            label="CA réalisé ce mois"
            value={formatPrice(caRealiseMonth)}
            hint={caRealiseTrend !== null ? `${caRealiseTrend >= 0 ? "+" : ""}${caRealiseTrend}% vs mois précédent` : undefined}
            hintPositive={caRealiseTrend !== null && caRealiseTrend >= 0}
            accent
          />
          <Stat
            label="Produits constatés d'avance"
            value={formatPrice(pcaCents)}
            hint={`${creditsInCirculation} crédit${creditsInCirculation > 1 ? "s" : ""} en circulation`}
            accent
          />
          <Stat
            label="Valeur moy. d'un crédit"
            value={formatPrice(avgCreditValueCents)}
            hint="Prix moyen historique"
            accent
          />
          <Stat
            label="Crédits consommés ce mois"
            value={creditsConsumedThisMonthN.toString()}
            hint={`${creditsConsumedLastMonthN} le mois précédent`}
            accent
          />
        </div>
      </section>

      {/* ── Section Activité ──────────────────────────────────────────────── */}
      <section>
        <SectionLabel>Activité (30 jours)</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Stat label="Réservations" value={bookingsLast30.toString()} />
          <Stat label="Annulations" value={cancelLast30.toString()} hint={bookingsLast30 > 0 ? `${Math.round(cancelLast30 / bookingsLast30 * 100)}%` : undefined} />
          <Stat label="No-shows" value={noShowLast30.toString()} hint={bookingsLast30 > 0 ? `${Math.round(noShowLast30 / bookingsLast30 * 100)}%` : undefined} />
          <Stat label="Taux remplissage" value={fillRate !== null ? `${fillRate}%` : "—"} hint="Séances passées" />
          <Stat label="Abonnements actifs" value={activeSubs.toString()} />
          <Stat label="Nouveaux membres" value={newUsersLast30.toString()} />
        </div>
      </section>

      {/* ── Charts ────────────────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <p className="section-title mb-1">CA encaissé vs réalisé — 12 mois</p>
          <p className="text-xs text-stone2-400 mb-4">
            Plein = cash reçu · Pointillé = crédits consommés × valeur moy.
          </p>
          <RevenueChart data={revenueChartData} />
        </div>
        <div className="card">
          <p className="section-title mb-1">Réservations — 14 jours</p>
          <p className="text-xs text-stone2-400 mb-4">Réservations confirmées vs annulations par jour.</p>
          <BookingsChart data={bookingsChartData} />
        </div>
      </div>

      {/* ── Top tables ────────────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <p className="section-title mb-3">Top instructeurs (30j)</p>
          {topInstructors.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="text-left">
                <tr>
                  <th className="text-[10px] uppercase tracking-[0.18em] text-stone2-500 font-normal pb-2">Instructeur</th>
                  <th className="text-[10px] uppercase tracking-[0.18em] text-stone2-500 font-normal pb-2 text-right">Inscrits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone2-100">
                {topInstructors.map((r) => (
                  <tr key={r.instructorId}>
                    <td className="py-2 text-brand-600">{r.firstName} {r.lastName}</td>
                    <td className="text-right font-medium text-brand-600">{Number(r.n)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-stone2-400">Aucune donnée.</p>
          )}
        </div>

        <div className="card">
          <p className="section-title mb-3">Top cours (30j)</p>
          {topClassTypes.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="text-left">
                <tr>
                  <th className="text-[10px] uppercase tracking-[0.18em] text-stone2-500 font-normal pb-2">Cours</th>
                  <th className="text-[10px] uppercase tracking-[0.18em] text-stone2-500 font-normal pb-2 text-right">Inscrits</th>
                  <th className="text-[10px] uppercase tracking-[0.18em] text-stone2-500 font-normal pb-2 text-right">Remplissage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone2-100">
                {topClassTypes.map((r) => (
                  <tr key={r.classTypeId}>
                    <td className="py-2 text-brand-600">{r.name}</td>
                    <td className="text-right text-brand-600">{Number(r.n)}</td>
                    <td className="text-right text-stone2-400">
                      {r.cap ? `${Math.round((Number(r.n) / Number(r.cap)) * 100)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-stone2-400">Aucune donnée.</p>
          )}
        </div>
      </div>

      {/* ── Footer note ───────────────────────────────────────────────────── */}
      <div className="border-t border-stone2-200 pt-4 flex flex-wrap gap-6 text-xs text-stone2-400">
        <span>Crédits en circulation : <strong className="text-brand-600">{creditsInCirculation}</strong></span>
        <span>Valeur moy. 1 crédit : <strong className="text-brand-600">{formatPrice(avgCreditValueCents)}</strong></span>
        <span>Crédits consommés (all time) : <strong className="text-brand-600">{Math.abs(creditsConsumedThisMonthN)}</strong> ce mois</span>
      </div>
    </div>
  );
}

// ── UI Components ────────────────────────────────────────────────────────────

function SectionLabel({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`flex items-center gap-3 mb-3`}>
      <span className={`inline-block h-px flex-1 ${accent ? "bg-accent-300" : "bg-stone2-200"}`} />
      <p className={`section-title ${accent ? "text-accent-600" : ""}`}>{children}</p>
      <span className={`inline-block h-px flex-1 ${accent ? "bg-accent-300" : "bg-stone2-200"}`} />
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  hintPositive,
  accent,
  muted,
}: {
  label: string;
  value: string;
  hint?: string;
  hintPositive?: boolean;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={`card ${accent ? "border-l-2 border-l-accent-400" : ""} ${muted ? "opacity-70" : ""}`}>
      <p className="section-title">{label}</p>
      <p className={`font-serif text-3xl mt-1 ${accent ? "text-accent-600" : "text-brand-600"}`}>{value}</p>
      {hint && (
        <p className={`text-xs mt-1 ${hintPositive === true ? "text-green-700" : hintPositive === false ? "text-red-600" : "text-stone2-400"}`}>
          {hint}
        </p>
      )}
    </div>
  );
}
