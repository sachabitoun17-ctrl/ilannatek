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
      <h1 className="text-2xl font-bold">Tableau de bord</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Membres" value={users.toString()} />
        <Stat label="Cours aujourd'hui" value={sessionsToday.toString()} />
        <Stat label="Réservations aujourd'hui" value={bookingsToday.toString()} />
        <Stat label="CA du mois" value={formatPrice(monthlyRevenue)} />
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">Prochains cours</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="py-2">Date</th>
              <th>Cours</th>
              <th>Instructeur</th>
              <th className="text-right">Inscrits</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {upcomingSessions.map((s) => {
              const confirmed = s.bookings.filter(
                (b) => b.status === "CONFIRMED"
              ).length;
              const waitlist = s.bookings.filter(
                (b) => b.status === "WAITLIST"
              ).length;
              return (
                <tr key={s.id}>
                  <td className="py-2">
                    {s.startTime.toLocaleString("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td>{s.classType.name}</td>
                  <td>
                    {s.instructor.firstName} {s.instructor.lastName}
                  </td>
                  <td className="text-right">
                    {confirmed}/{s.capacity}
                    {waitlist > 0 && (
                      <span className="text-amber-600"> +{waitlist}</span>
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
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
