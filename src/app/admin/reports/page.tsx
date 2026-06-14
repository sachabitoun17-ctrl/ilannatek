import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { requireAdmin } from "@/lib/auth";
import { RevenueChart } from "./RevenueChart";
import { BookingsChart } from "./BookingsChart";

export default async function ReportsPage() {
  const adminUser = await requireAdmin();
  const studioId = adminUser.studioId ?? undefined;
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const startYTD = new Date(now.getFullYear(), 0, 1);
  const ago30 = new Date(Date.now() - 30 * 86400000);

  const [
    revenueThisMonth,
    revenueLastMonth,
    revenueYTD,
    revenueByType,
    creditsEconomy,
    creditsConsumedMonth,
    creditsConsumedLastMonth,
    creditsConsumedYTD,
    totalCreditsInCirculation,
    sessionsDeliveredMonth,
    caByClassType,
    bookingsLast30,
    cancelLast30,
    noShowLast30,
    activeSubs,
    newUsersLast30,
    topInstructors,
    monthlyRevenue,
    monthlyConsumed,
    dailyBookings,
    sessionsLast30,
    mrrSubscriptions,
  ] = await Promise.all([
    // ── Encaissements ────────────────────────────────────────────────────────
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
    // Breakdown packs vs abonnements (mois en cours)
    db.transaction.groupBy({
      by: ["type"],
      _sum: { amountCents: true },
      where: {
        paymentStatus: "PAID",
        type: { in: ["PURCHASE_PACK", "PURCHASE_SUBSCRIPTION"] },
        createdAt: { gte: startMonth },
      },
    }),
    // ── Credit economics (all-time, for avg value) ───────────────────────────
    db.transaction.aggregate({
      _sum: { amountCents: true, creditsDelta: true },
      where: { paymentStatus: "PAID", creditsDelta: { gt: 0 } },
    }),
    // ── Credits consumed ─────────────────────────────────────────────────────
    db.transaction.aggregate({
      _sum: { creditsDelta: true },
      where: { type: "CREDIT_USE", createdAt: { gte: startMonth } },
    }),
    db.transaction.aggregate({
      _sum: { creditsDelta: true },
      where: { type: "CREDIT_USE", createdAt: { gte: startLastMonth, lte: endLastMonth } },
    }),
    db.transaction.aggregate({
      _sum: { creditsDelta: true },
      where: { type: "CREDIT_USE", createdAt: { gte: startYTD } },
    }),
    // ── Liability ────────────────────────────────────────────────────────────
    db.user.aggregate({ _sum: { creditsBalance: true } }),
    // ── Sessions delivered this month (with ≥1 attendee) ────────────────────
    db.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT COUNT(DISTINCT s.id)::int as n
       FROM "Session" s
       JOIN "Booking" b ON b."sessionId" = s.id AND b.status IN ('CONFIRMED','ATTENDED')
       WHERE s."startTime" >= $1 AND s."startTime" <= $2`,
      startMonth, now
    ),
    // ── CA réalisé par type de cours (30j passés) ────────────────────────────
    db.$queryRawUnsafe<{
      name: string; color: string; creditCost: number;
      sessions: bigint; attendees: bigint; creditsUsed: bigint;
    }[]>(
      `SELECT ct.name, ct.color, ct."creditCost",
              COUNT(DISTINCT s.id)::int as sessions,
              COUNT(b.id)::int as attendees,
              (COUNT(b.id) * ct."creditCost")::int as "creditsUsed"
       FROM "Booking" b
       JOIN "Session" s ON s.id = b."sessionId"
       JOIN "ClassType" ct ON ct.id = s."classTypeId"
       WHERE b.status IN ('CONFIRMED','ATTENDED')
         AND s."startTime" >= NOW() - INTERVAL '30 days'
         AND s."startTime" <= NOW()
       GROUP BY ct.id, ct.name, ct.color, ct."creditCost"
       ORDER BY "creditsUsed" DESC`
    ),
    // ── Operations ───────────────────────────────────────────────────────────
    db.booking.count({ where: { createdAt: { gte: ago30 } } }),
    db.booking.count({ where: { status: "CANCELLED", cancelledAt: { gte: ago30 } } }),
    db.booking.count({ where: { status: "NO_SHOW", updatedAt: { gte: ago30 } } }),
    db.subscription.count({ where: { status: "ACTIVE", endDate: { gt: now } } }),
    db.user.count({ where: { createdAt: { gte: ago30 } } }),
    // ── Top instructeurs ─────────────────────────────────────────────────────
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
    // ── Charts ───────────────────────────────────────────────────────────────
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
      where: { studioId, startTime: { gte: ago30, lte: now }, status: "SCHEDULED", capacity: { gt: 0 } },
      select: {
        capacity: true,
        bookings: { where: { status: { in: ["CONFIRMED", "ATTENDED"] } }, select: { id: true } },
      },
    }),
    db.subscription.findMany({
      where: { status: "ACTIVE", endDate: { gt: now } },
      select: { plan: { select: { priceCents: true, intervalDays: true } } },
    }),
  ]);

  // ── Derived: MRR ────────────────────────────────────────────────────────────

  const mrr = mrrSubscriptions.reduce((sum, sub) => {
    const days = sub.plan.intervalDays ?? 30;
    return sum + Math.round((sub.plan.priceCents / days) * 30);
  }, 0);
  const arr = mrr * 12;

  // ── Derived: encaissements ───────────────────────────────────────────────────

  const rev = revenueThisMonth._sum.amountCents ?? 0;
  const revPrev = revenueLastMonth._sum.amountCents ?? 0;
  const revYTD = revenueYTD._sum.amountCents ?? 0;
  const revTrend = revPrev > 0 ? Math.round(((rev - revPrev) / revPrev) * 100) : null;

  const packRevMonth = revenueByType.find((r) => r.type === "PURCHASE_PACK")?._sum.amountCents ?? 0;
  const subRevMonth = revenueByType.find((r) => r.type === "PURCHASE_SUBSCRIPTION")?._sum.amountCents ?? 0;

  // ── Derived: credit economics ────────────────────────────────────────────────

  const totalRevAllTime = creditsEconomy._sum.amountCents ?? 0;
  const totalCreditsGranted = creditsEconomy._sum.creditsDelta ?? 1;
  const avgCreditValueCents = totalCreditsGranted > 0
    ? Math.round(totalRevAllTime / totalCreditsGranted)
    : 0;

  const consumedThisMonth = Math.abs(creditsConsumedMonth._sum.creditsDelta ?? 0);
  const consumedLastMonth = Math.abs(creditsConsumedLastMonth._sum.creditsDelta ?? 0);
  const consumedYTD = Math.abs(creditsConsumedYTD._sum.creditsDelta ?? 0);

  const caRealiseMonth = consumedThisMonth * avgCreditValueCents;
  const caRealisePrev = consumedLastMonth * avgCreditValueCents;
  const caRealiseYTD = consumedYTD * avgCreditValueCents;
  const caRealiseTrend = caRealisePrev > 0
    ? Math.round(((caRealiseMonth - caRealisePrev) / caRealisePrev) * 100)
    : null;

  const creditsInCirculation = totalCreditsInCirculation._sum.creditsBalance ?? 0;
  const pcaCents = creditsInCirculation * avgCreditValueCents;
  // PCA ratio: liability as % of YTD revenue (health indicator)
  const pcaRatio = revYTD > 0 ? Math.round((pcaCents / revYTD) * 100) : null;

  const sessionsDeliveredN = Number(sessionsDeliveredMonth[0]?.n ?? 0);
  const revenuePerSession = sessionsDeliveredN > 0
    ? Math.round(caRealiseMonth / sessionsDeliveredN)
    : 0;

  // CA réalisé by class type with euro value
  const caByClassTypeFormatted = caByClassType.map((r) => ({
    name: r.name,
    color: r.color,
    creditCost: r.creditCost,
    sessions: Number(r.sessions),
    attendees: Number(r.attendees),
    creditsUsed: Number(r.creditsUsed),
    caRealise: Number(r.creditsUsed) * avgCreditValueCents,
  }));
  const totalCreditsUsedByType = caByClassTypeFormatted.reduce((s, r) => s + r.creditsUsed, 0);

  // ── Derived: operations ──────────────────────────────────────────────────────

  const fillRate = sessionsLast30.length > 0
    ? Math.round(
        sessionsLast30.reduce((acc, s) => acc + s.bookings.length / s.capacity, 0) /
        sessionsLast30.length * 100
      )
    : null;

  // ── Chart data ───────────────────────────────────────────────────────────────

  const consumedMap = new Map(monthlyConsumed.map((r) => [r.month, Number(r.consumed)]));
  const revenueChartData = monthlyRevenue.map((r) => ({
    month: r.month.slice(5),
    encaisse: Number(r.revenue),
    realise: Math.round((consumedMap.get(r.month) ?? 0) * avgCreditValueCents),
  }));

  const bookingsChartData = dailyBookings.map((r) => ({
    day: r.day.slice(5),
    bookings: Number(r.bookings),
    cancels: Number(r.cancels),
  }));

  const monthName = now.toLocaleDateString("fr-FR", { month: "long" });

  return (
    <div className="space-y-10">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-title">Administration</p>
          <h1 className="font-serif text-4xl md:text-5xl font-medium text-brand-600 mt-0.5 leading-none">
            Dashboard
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/admin/export/transactions" className="btn-secondary text-xs">↓ Transactions</a>
          <a href="/api/admin/export/bookings" className="btn-secondary text-xs">↓ Réservations</a>
          <a href="/api/admin/export/users" className="btn-secondary text-xs">↓ Membres</a>
        </div>
      </div>

      {/* ── Section 1 : Encaissements ─────────────────────────────────────────── */}
      <section>
        <SectionLabel>Encaissements — cash reçu</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat
            label={`CA ${monthName}`}
            value={formatPrice(rev)}
            hint={revTrend !== null ? `${revTrend >= 0 ? "+" : ""}${revTrend}% vs mois préc.` : undefined}
            hintPositive={revTrend !== null ? revTrend >= 0 : undefined}
          />
          <Stat label="CA mois précédent" value={formatPrice(revPrev)} muted />
          <Stat label={`CA ${now.getFullYear()}`} value={formatPrice(revYTD)} muted />
          <div className="card border-stone2-200">
            <p className="section-title mb-2">Ventilation {monthName}</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone2-500 text-xs uppercase tracking-wider">Packs</span>
                <span className="font-medium text-brand-600">{formatPrice(packRevMonth)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone2-500 text-xs uppercase tracking-wider">Abonnements</span>
                <span className="font-medium text-brand-600">{formatPrice(subRevMonth)}</span>
              </div>
              {rev > 0 && (
                <div className="mt-2 h-1.5 bg-stone2-100 overflow-hidden">
                  <div
                    className="h-full bg-brand-600"
                    style={{ width: `${Math.round((packRevMonth / rev) * 100)}%` }}
                  />
                </div>
              )}
              {rev > 0 && (
                <p className="text-[10px] text-stone2-400">
                  {Math.round((packRevMonth / rev) * 100)}% packs · {Math.round((subRevMonth / rev) * 100)}% abos
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── MRR ─────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 -mt-4">
        <Stat
          label={`MRR — ${mrrSubscriptions.length} abo${mrrSubscriptions.length > 1 ? "s" : ""} actif${mrrSubscriptions.length > 1 ? "s" : ""}`}
          value={formatPrice(mrr)}
          hint="Revenu mensuel récurrent prévu"
          accent
        />
        <Stat
          label="ARR"
          value={formatPrice(arr)}
          hint="Extrapolé × 12 mois"
          accent
        />
      </div>

      {/* ── Section 2 : CA Réalisé ────────────────────────────────────────────── */}
      <section>
        <SectionLabel accent>CA réalisé — services délivrés</SectionLabel>
        <p className="text-xs text-stone2-400 mb-4 max-w-2xl">
          Revenus économiquement gagnés : chaque crédit consommé en séance, valorisé au prix moyen
          d'un crédit vendu (<strong>{formatPrice(avgCreditValueCents)}</strong>). S'oppose aux encaissements
          qui comprennent les crédits non encore utilisés (produits constatés d'avance).
        </p>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Stat
            label={`CA réalisé ${monthName}`}
            value={formatPrice(caRealiseMonth)}
            hint={caRealiseTrend !== null ? `${caRealiseTrend >= 0 ? "+" : ""}${caRealiseTrend}% vs mois préc.` : undefined}
            hintPositive={caRealiseTrend !== null ? caRealiseTrend >= 0 : undefined}
            accent
          />
          <Stat
            label={`CA réalisé ${now.getFullYear()}`}
            value={formatPrice(caRealiseYTD)}
            hint={`sur ${formatPrice(revYTD)} encaissés`}
            accent
          />
          <Stat
            label="Revenu / séance"
            value={formatPrice(revenuePerSession)}
            hint={`${sessionsDeliveredN} séance${sessionsDeliveredN > 1 ? "s" : ""} dispensée${sessionsDeliveredN > 1 ? "s" : ""} ce mois`}
            accent
          />
          <Stat
            label="Crédits consommés"
            value={consumedThisMonth.toString()}
            hint={`${consumedLastMonth} le mois précédent · ${consumedYTD} YTD`}
            accent
          />
        </div>

        {/* Breakdown by class type */}
        {caByClassTypeFormatted.length > 0 && (
          <div className="card">
            <p className="section-title mb-4">CA réalisé par type de cours — 30 derniers jours</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left">
                  <tr>
                    <th className="th">Cours</th>
                    <th className="th text-right">Séances</th>
                    <th className="th text-right">Élèves</th>
                    <th className="th text-right">Crédits</th>
                    <th className="th text-right">CA réalisé</th>
                    <th className="th text-right">Part</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone2-100">
                  {caByClassTypeFormatted.map((r) => {
                    const share = totalCreditsUsedByType > 0
                      ? Math.round((r.creditsUsed / totalCreditsUsedByType) * 100)
                      : 0;
                    return (
                      <tr key={r.name}>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block w-1 h-5 shrink-0"
                              style={{ backgroundColor: r.color }}
                            />
                            <span className="text-brand-600 font-medium">{r.name}</span>
                            <span className="text-[10px] text-stone2-400 uppercase tracking-wider">
                              {r.creditCost} cr.
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-right text-stone2-600">{r.sessions}</td>
                        <td className="py-3 text-right text-stone2-600">{r.attendees}</td>
                        <td className="py-3 text-right text-stone2-600">{r.creditsUsed}</td>
                        <td className="py-3 text-right font-medium text-accent-600">
                          {formatPrice(r.caRealise)}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1 bg-stone2-100 hidden md:block">
                              <div
                                className="h-full bg-accent-400"
                                style={{ width: `${share}%` }}
                              />
                            </div>
                            <span className="text-xs text-stone2-400">{share}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-stone2-200">
                  <tr>
                    <td className="pt-3 font-medium text-brand-600">Total</td>
                    <td className="pt-3 text-right font-medium text-brand-600">
                      {caByClassTypeFormatted.reduce((s, r) => s + r.sessions, 0)}
                    </td>
                    <td className="pt-3 text-right font-medium text-brand-600">
                      {caByClassTypeFormatted.reduce((s, r) => s + r.attendees, 0)}
                    </td>
                    <td className="pt-3 text-right font-medium text-brand-600">
                      {totalCreditsUsedByType}
                    </td>
                    <td className="pt-3 text-right font-semibold text-accent-600">
                      {formatPrice(caByClassTypeFormatted.reduce((s, r) => s + r.caRealise, 0))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* PCA — Produits constatés d'avance */}
        <div className="mt-3 grid md:grid-cols-[1fr_auto] gap-3">
          <div className="card border-l-2 border-l-stone2-400">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="section-title">Produits constatés d'avance (engagement)</p>
                <p className="font-serif text-3xl text-stone2-600 mt-1">{formatPrice(pcaCents)}</p>
                <p className="text-xs text-stone2-400 mt-1">
                  {creditsInCirculation} crédit{creditsInCirculation !== 1 ? "s" : ""} en circulation
                  {" "}× {formatPrice(avgCreditValueCents)} valeur moy.
                </p>
              </div>
              {pcaRatio !== null && (
                <div className="text-right">
                  <p className="section-title">Ratio PCA / CA YTD</p>
                  <p className={`font-serif text-3xl mt-1 ${pcaRatio > 30 ? "text-amber-600" : "text-brand-600"}`}>
                    {pcaRatio}%
                  </p>
                  <p className="text-xs text-stone2-400 mt-1">
                    {pcaRatio > 30 ? "Engagement élevé — surveiller" : "Niveau sain"}
                  </p>
                </div>
              )}
            </div>
            <p className="text-xs text-stone2-400 mt-4 border-t border-stone2-100 pt-3">
              Les produits constatés d'avance représentent l'obligation du studio envers ses membres :
              des crédits ont été payés mais les séances correspondantes n'ont pas encore eu lieu.
              Ce montant diminue à chaque séance dispensée.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 3 : Activité ──────────────────────────────────────────────── */}
      <section>
        <SectionLabel>Activité — 30 jours</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Stat label="Réservations" value={bookingsLast30.toString()} />
          <Stat
            label="Annulations"
            value={cancelLast30.toString()}
            hint={bookingsLast30 > 0 ? `${Math.round((cancelLast30 / bookingsLast30) * 100)}% des rés.` : undefined}
          />
          <Stat
            label="No-shows"
            value={noShowLast30.toString()}
            hint={bookingsLast30 > 0 ? `${Math.round((noShowLast30 / bookingsLast30) * 100)}% des rés.` : undefined}
          />
          <Stat
            label="Taux remplissage"
            value={fillRate !== null ? `${fillRate}%` : "—"}
            hint="Séances passées"
            hintPositive={fillRate !== null ? fillRate >= 70 : undefined}
          />
          <Stat label="Abonnements actifs" value={activeSubs.toString()} />
          <Stat label="Nouveaux membres" value={newUsersLast30.toString()} />
        </div>
      </section>

      {/* ── Charts ───────────────────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <p className="section-title mb-1">CA encaissé vs CA réalisé — 12 mois</p>
          <p className="text-xs text-stone2-400 mb-4">
            Plein = cash reçu · Pointillé ochre = crédits consommés × valeur moy.
            L'écart = variation des produits constatés d'avance.
          </p>
          <RevenueChart data={revenueChartData} />
        </div>
        <div className="card">
          <p className="section-title mb-1">Réservations — 14 jours</p>
          <p className="text-xs text-stone2-400 mb-4">Réservations confirmées vs annulations par jour.</p>
          <BookingsChart data={bookingsChartData} />
        </div>
      </div>

      {/* ── Top instructeurs ─────────────────────────────────────────────────── */}
      <div className="card">
        <p className="section-title mb-3">Top instructeurs — 30 jours</p>
        {topInstructors.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="text-left">
              <tr>
                <th className="th">Instructeur</th>
                <th className="th text-right">Élèves</th>
                <th className="th text-right">CA réalisé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone2-100">
              {topInstructors.map((r) => {
                const attendees = Number(r.n);
                const ca = attendees * avgCreditValueCents; // approx, assuming 1 credit per booking
                return (
                  <tr key={r.instructorId}>
                    <td className="py-2.5 text-brand-600 font-medium">{r.firstName} {r.lastName}</td>
                    <td className="py-2.5 text-right text-stone2-600">{attendees}</td>
                    <td className="py-2.5 text-right text-accent-600 font-medium">~{formatPrice(ca)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-stone2-400">Aucune donnée.</p>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <div className="border-t border-stone2-200 pt-4 grid sm:grid-cols-3 gap-4 text-xs text-stone2-400">
        <div>
          <p className="uppercase tracking-wider mb-1">Valorisation des crédits</p>
          <p>Prix moy. d'un crédit : <strong className="text-brand-600">{formatPrice(avgCreditValueCents)}</strong></p>
          <p>Calculé sur {totalCreditsGranted} crédits vendus pour {formatPrice(totalRevAllTime)}</p>
        </div>
        <div>
          <p className="uppercase tracking-wider mb-1">Solde crédits membres</p>
          <p><strong className="text-brand-600">{creditsInCirculation}</strong> crédits en circulation</p>
          <p>Engagement estimé : <strong className="text-brand-600">{formatPrice(pcaCents)}</strong></p>
        </div>
        <div>
          <p className="uppercase tracking-wider mb-1">Crédits consommés</p>
          <p>Ce mois : <strong className="text-brand-600">{consumedThisMonth}</strong></p>
          <p>YTD : <strong className="text-brand-600">{consumedYTD}</strong></p>
        </div>
      </div>
    </div>
  );
}

// ── UI Components ─────────────────────────────────────────────────────────────

function SectionLabel({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className={`inline-block h-px flex-1 ${accent ? "bg-accent-300" : "bg-stone2-200"}`} />
      <p className={`section-title ${accent ? "text-accent-600" : ""}`}>{children}</p>
      <span className={`inline-block h-px flex-1 ${accent ? "bg-accent-300" : "bg-stone2-200"}`} />
    </div>
  );
}

function Stat({
  label, value, hint, hintPositive, accent, muted,
}: {
  label: string; value: string; hint?: string;
  hintPositive?: boolean; accent?: boolean; muted?: boolean;
}) {
  return (
    <div className={`card ${accent ? "border-l-2 border-l-accent-400" : ""} ${muted ? "opacity-60" : ""}`}>
      <p className="section-title">{label}</p>
      <p className={`font-serif text-3xl mt-1 ${accent ? "text-accent-600" : "text-brand-600"}`}>{value}</p>
      {hint && (
        <p className={`text-xs mt-1 ${
          hintPositive === true ? "text-green-700" :
          hintPositive === false ? "text-red-600" :
          "text-stone2-400"
        }`}>{hint}</p>
      )}
    </div>
  );
}
