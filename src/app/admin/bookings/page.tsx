import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Toutes les réservations</h1>
        <form>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="input"
          >
            <option value="">Tous statuts</option>
            <option value="CONFIRMED">Confirmé</option>
            <option value="WAITLIST">Liste d&apos;attente</option>
            <option value="CANCELLED">Annulé</option>
            <option value="ATTENDED">Présent</option>
            <option value="NO_SHOW">Absent</option>
          </select>
          <button className="btn-secondary ml-2">Filtrer</button>
        </form>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="py-2">Date cours</th>
              <th>Cours</th>
              <th>Membre</th>
              <th>Statut</th>
              <th>Crédits</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {bookings.map((b) => (
              <tr key={b.id}>
                <td className="py-2">{formatDateTime(b.session.startTime)}</td>
                <td>
                  {b.session.classType.name} · {b.session.location.name}
                </td>
                <td>
                  <div className="font-medium">
                    {b.user.firstName} {b.user.lastName}
                  </div>
                  <div className="text-xs text-gray-500">{b.user.email}</div>
                </td>
                <td>
                  <span className="badge bg-gray-100">
                    {b.status}
                    {b.waitlistPos ? ` #${b.waitlistPos}` : ""}
                  </span>
                </td>
                <td>{b.creditsUsed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
