import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmé",
  WAITLIST: "Attente",
  CANCELLED: "Annulé",
  ATTENDED: "Présent",
  NO_SHOW: "Absent",
};

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-stone2-100 text-stone2-700",
  WAITLIST: "bg-accent-100 text-accent-700",
  CANCELLED: "bg-stone2-50 text-stone2-400",
  ATTENDED: "bg-green-50 text-green-700",
  NO_SHOW: "bg-red-50 text-red-700",
};

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const status = searchParams.status;
  const bookings = await db.booking.findMany({
    where: status ? { status } : undefined,
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      session: {
        include: { classType: true, location: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-title">Administration</p>
          <h1 className="font-serif text-4xl font-medium text-brand-600 mt-1">Réservations</h1>
        </div>
        <form className="flex items-center gap-2">
          <select
            name="status"
            defaultValue={status ?? ""}
            className="input text-sm"
          >
            <option value="">Tous statuts</option>
            <option value="CONFIRMED">Confirmé</option>
            <option value="WAITLIST">Liste d&apos;attente</option>
            <option value="CANCELLED">Annulé</option>
            <option value="ATTENDED">Présent</option>
            <option value="NO_SHOW">Absent</option>
          </select>
          <button className="btn-secondary">Filtrer</button>
        </form>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[10px] uppercase tracking-[0.18em] text-stone2-500 border-b border-stone2-100">
            <tr>
              <th className="pb-2">Date cours</th>
              <th className="hidden sm:table-cell">Cours</th>
              <th>Membre</th>
              <th>Statut</th>
              <th className="hidden md:table-cell text-right">Crédits</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone2-100">
            {bookings.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-stone2-400">
                  Aucune réservation
                </td>
              </tr>
            )}
            {bookings.map((b) => (
              <tr key={b.id}>
                <td className="py-2 text-stone2-600 whitespace-nowrap">
                  {formatDateTime(b.session.startTime)}
                </td>
                <td className="hidden sm:table-cell text-stone2-600">
                  {b.session.classType.name} · {b.session.location.name}
                </td>
                <td>
                  <div className="font-medium">
                    {b.user.firstName} {b.user.lastName}
                  </div>
                  <div className="text-xs text-stone2-500">{b.user.email}</div>
                </td>
                <td>
                  <span className={`badge ${STATUS_COLORS[b.status] ?? "bg-stone2-100 text-stone2-700"}`}>
                    {STATUS_LABELS[b.status] ?? b.status}
                    {b.waitlistPos ? ` #${b.waitlistPos}` : ""}
                  </span>
                </td>
                <td className="hidden md:table-cell text-right text-stone2-600">
                  {b.creditsUsed}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
