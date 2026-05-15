import { db } from "@/lib/db";
import { endOfDay, formatPrice, startOfDay } from "@/lib/utils";

export default async function AdminDashboard() {
  const today = new Date();
  const [users, sessionsToday, bookingsToday, revenueRow, upcomingSessions] =
    await Promise.all([
      db.user.count(),
      db.session.count({
        where: {
          startTime: { gte: startOfDay(today), lte: endOfDay(today) },
        },
      }),
      db.booking.count({
        where: {
          status: "CONFIRMED",
          session: {
            startTime: { gte: startOfDay(today), lte: endOfDay(today) },
          },
        },
      }),
      db.transaction.aggregate({
        _sum: { amountCents: true },
        where: {
          type: { in: ["PURCHASE_PACK", "PURCHASE_SUBSCRIPTION"] },
          createdAt: {
            gte: new Date(today.getFullYear(), today.getMonth(), 1),
          },
        },
      }),
      db.session.findMany({
        where: { startTime: { gte: today }, status: "SCHEDULED" },
        include: {
          classType: true,
          instructor: { select: { firstName: true, lastName: true } },
          bookings: { where: { status: { in: ["CONFIRMED", "WAITLIST"] } } },
        },
        orderBy: { startTime: "asc" },
        take: 8,
      }),
    ]);

  const monthlyRevenue = revenueRow._sum.amountCents ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="section-title">Administration</p>
        <h1 className="font-serif text-4xl font-medium text-brand-600 mt-1">Tableau de bord</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Membres" value={users.toString()} />
        <Stat label="Cours aujourd'hui" value={sessionsToday.toString()} />
        <Stat label="Réservations" value={bookingsToday.toString()} />
        <Stat label="CA du mois" value={formatPrice(monthlyRevenue)} />
      </div>

      <div className="card overflow-x-auto">
        <p className="section-title mb-4">Prochains cours</p>
        <table className="w-full text-sm">
          <thead className="text-left text-[10px] uppercase tracking-[0.18em] text-stone2-500 border-b border-stone2-100">
            <tr>
              <th className="pb-2">Date</th>
              <th>Cours</th>
              <th className="hidden sm:table-cell">Instructeur</th>
              <th className="text-right">Inscrits</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone2-100">
            {upcomingSessions.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm text-stone2-400">
                  Aucun cours programmé
                </td>
              </tr>
            )}
            {upcomingSessions.map((s) => {
              const confirmed = s.bookings.filter(
                (b) => b.status === "CONFIRMED"
              ).length;
              const waitlist = s.bookings.filter(
                (b) => b.status === "WAITLIST"
              ).length;
              return (
                <tr key={s.id}>
                  <td className="py-2 text-stone2-600 whitespace-nowrap">
                    {s.startTime.toLocaleString("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="font-medium">{s.classType.name}</td>
                  <td className="hidden sm:table-cell text-stone2-600">
                    {s.instructor.firstName} {s.instructor.lastName}
                  </td>
                  <td className="text-right">
                    {confirmed}/{s.capacity}
                    {waitlist > 0 && (
                      <span className="text-accent-600"> +{waitlist}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <p className="section-title">{label}</p>
      <p className="font-serif text-3xl font-medium text-brand-600 mt-1">{value}</p>
    </div>
  );
}
