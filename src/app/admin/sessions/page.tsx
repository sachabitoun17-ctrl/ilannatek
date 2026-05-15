import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { deleteSessionAction } from "./actions";
import DeleteForm from "@/components/DeleteForm";

export default async function AdminSessionsPage() {
  const sessions = await db.session.findMany({
    include: {
      classType: true,
      instructor: { select: { firstName: true, lastName: true } },
      location: true,
      bookings: { where: { status: { in: ["CONFIRMED", "WAITLIST"] } } },
    },
    orderBy: { startTime: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cours</h1>
        <Link href="/admin/sessions/new" className="btn-primary">
          + Nouveau cours
        </Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="py-2">Date</th>
              <th>Type</th>
              <th>Instructeur</th>
              <th>Studio</th>
              <th className="text-right">Inscrits</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sessions.map((s) => {
              const confirmed = s.bookings.filter(
                (b) => b.status === "CONFIRMED"
              ).length;
              const waitlist = s.bookings.filter(
                (b) => b.status === "WAITLIST"
              ).length;
              return (
                <tr key={s.id}>
                  <td className="py-2">{formatDateTime(s.startTime)}</td>
                  <td>{s.classType.name}</td>
                  <td>
                    {s.instructor.firstName} {s.instructor.lastName}
                  </td>
                  <td>{s.location.name}</td>
                  <td className="text-right">
                    {confirmed}/{s.capacity}
                    {waitlist > 0 && (
                      <span className="text-amber-600"> +{waitlist}</span>
                    )}
                  </td>
                  <td>
                    <span className="badge bg-gray-100 text-gray-700">
                      {s.status}
                    </span>
                  </td>
                  <td className="text-right flex justify-end gap-2 py-2">
                    <Link
                      href={`/admin/sessions/${s.id}`}
                      className="text-brand-600 hover:underline text-xs"
                    >
                      Éditer
                    </Link>
                    <DeleteForm
                      action={deleteSessionAction}
                      id={s.id}
                      confirmMsg="Supprimer ce cours ?"
                    />
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
