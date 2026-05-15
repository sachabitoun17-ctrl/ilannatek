import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { RevenueChart } from "./RevenueChart";
import { BookingsChart } from "./BookingsChart";

export default async function ReportsPage() {
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [
    revenueThisMonth,
    revenueLastMonth,
    txCount,
    creditsConsumed,
    bookingsLast30,
    cancelLast30,
    noShowLast30,
    topInstructors,
    topClassTypes,
    activeSubs,
    newUsersLast30,
    monthlyRevenue,
    dailyBookings,
  ] = await Promise.all([
    db.transaction.aggregate({
      _sum: { amountCents: true },
      where: { paymentStatus: "PAID", createdAt: { gte: startMonth } },
    }),
    db.transaction.aggregate({
      _sum: { amountCents: true },
      where: {
        paymentStatus: "PAID",
        createdAt: { gte: startLastMonth, lte: endLastMonth },
      },
    }),
    db.transaction.count({ where: { paymentStatus: "PAID" } }),
    db.transaction.aggregate({
      _sum: { creditsDelta: true },
      where: { type: "CREDIT_USE" },
    }),
    db.booking.count({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
    }),
    db.booking.count({
      where: {
        status: "CANCELLED",
        cancelledAt: { gte: new Date(Date.now() - 30 * 86400000) },
      },
    }),
    db.booking.count({
      where: {
        status: "NO_SHOW",
        updatedAt: { gte: new Date(Date.now() - 30 * 86400000) },
      },
    }),
    db.$queryRawUnsafe<{ instructorId: string; firstName: string; lastName: string; n: number }[]>(
      `SELECT s.instructorId, u.firstName, u.lastName, COUNT(b.id) as n
       FROM Booking b
       JOIN Session s ON s.id = b.sessionId
       JOIN User u ON u.id = s.instructorId
       WHERE b.status IN ('CONFIRMED', 'ATTENDED')
         AND b.createdAt >= date('now', '-30 day')
       GROUP BY s.instructorId
       ORDER BY n DESC LIMIT 5`
    ),
    db.$queryRawUnsafe<{ classTypeId: string; name: string; n: number; cap: number }[]>(
      `SELECT s.classTypeId, ct.name, COUNT(b.id) as n, SUM(s.capacity) as cap
       FROM Booking b
       JOIN Session s ON s.id = b.sessionId
       JOIN ClassType ct ON ct.id = s.classTypeId
       WHERE b.status IN ('CONFIRMED', 'ATTENDED')
         AND s.startTime >= date('now', '-30 day')
       GROUP BY s.classTypeId
       ORDER BY n DESC LIMIT 5`
    ),
    db.subscription.count({
      where: { status: "ACTIVE", endDate: { gt: now } },
    }),
    db.user.count({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
    }),
    db.$queryRawUnsafe<{ month: string; revenue: number }[]>(
      `SELECT strftime('%Y-%m', createdAt) as month, SUM(amountCents) as revenue
       FROM "Transaction"
       WHERE paymentStatus = 'PAID'
         AND createdAt >= date('now', '-12 months')
       GROUP BY month
       ORDER BY month ASC`
    ),
    db.$queryRawUnsafe<{ day: string; bookings: number; cancels: number }[]>(
      `SELECT
         date(b.createdAt) as day,
         COUNT(CASE WHEN b.status IN ('CONFIRMED','ATTENDED','WAITLIST') THEN 1 END) as bookings,
         COUNT(CASE WHEN b.status = 'CANCELLED' THEN 1 END) as cancels
       FROM Booking b
       WHERE b.createdAt >= date('now', '-14 day')
       GROUP BY day
       ORDER BY day ASC`
    ),
  ]);

  const rev = revenueThisMonth._sum.amountCents ?? 0;
  const revPrev = revenueLastMonth._sum.amountCents ?? 0;
  const trend = revPrev > 0 ? Math.round(((rev - revPrev) / revPrev) * 100) : 0;

  const revenueChartData = monthlyRevenue.map((r) => ({
    month: r.month.slice(0, 7),
    revenue: Number(r.revenue),
  }));

  const bookingsChartData = dailyBookings.map((r) => ({
    day: r.day.slice(5),
    bookings: Number(r.bookings),
    cancels: Number(r.cancels),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Reporting</h1>
        <div className="flex flex-wrap gap-2">
          <a href="/api/export/transactions" className="btn-secondary text-sm">
            ↓ Transactions CSV
          </a>
          <a href="/api/export/bookings" className="btn-secondary text-sm">
            ↓ Réservations CSV
          </a>
          <a href="/api/export/members" className="btn-secondary text-sm">
            ↓ Membres CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="CA mois en cours" value={formatPrice(rev)} hint={`${trend >= 0 ? "+" : ""}${trend}% vs mois -1`} />
        <Stat label="CA mois précédent" value={formatPrice(revPrev)} />
        <Stat label="Transactions payées" value={txCount.toString()} />
        <Stat label="Abos actifs" value={activeSubs.toString()} />
        <Stat label="Réservations 30j" value={bookingsLast30.toString()} />
        <Stat label="Annulations 30j" value={cancelLast30.toString()} />
        <Stat label="No-shows 30j" value={noShowLast30.toString()} />
        <Stat label="Nouveaux membres 30j" value={newUsersLast30.toString()} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold mb-4">Chiffre d'affaires — 12 derniers mois</h3>
          <RevenueChart data={revenueChartData} />
        </div>
        <div className="card">
          <h3 className="font-semibold mb-4">Réservations — 14 derniers jours</h3>
          <BookingsChart data={bookingsChartData} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold mb-2">Top instructeurs (30j)</h3>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 text-left">
              <tr>
                <th>Instructeur</th>
                <th className="text-right">Inscrits</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {topInstructors.map((r) => (
                <tr key={r.instructorId}>
                  <td className="py-2">
                    {r.firstName} {r.lastName}
                  </td>
                  <td className="text-right font-medium">{Number(r.n)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-2">Top cours (30j)</h3>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 text-left">
              <tr>
                <th>Cours</th>
                <th className="text-right">Inscrits</th>
                <th className="text-right">Remplissage</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {topClassTypes.map((r) => (
                <tr key={r.classTypeId}>
                  <td className="py-2">{r.name}</td>
                  <td className="text-right">{Number(r.n)}</td>
                  <td className="text-right text-gray-500">
                    {r.cap ? `${Math.round((Number(r.n) / Number(r.cap)) * 100)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Crédits totaux consommés depuis le début : {Math.abs(creditsConsumed._sum.creditsDelta ?? 0)}.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
