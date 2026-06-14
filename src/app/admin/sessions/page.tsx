import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { deleteSessionAction } from "./actions";
import DeleteForm from "@/components/DeleteForm";
import { requireAdmin } from "@/lib/auth";

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Programmé",
  CANCELLED: "Annulé",
  COMPLETED: "Terminé",
};

export default async function AdminSessionsPage() {
  const user = await requireAdmin();
  const studioId = user.studioId ?? undefined;
  const sessions = await db.session.findMany({
    where: { studioId },
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-title">Administration</p>
          <h1 className="font-serif text-4xl font-medium text-brand-600 mt-1">Cours</h1>
        </div>
        <Link href="/admin/sessions/new" className="btn-primary">
          + Nouveau cours
        </Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[10px] uppercase tracking-[0.18em] text-stone2-500 border-b border-stone2-100">
            <tr>
              <th className="pb-2">Date</th>
              <th>Type</th>
              <th className="hidden md:table-cell">Instructeur</th>
              <th className="hidden lg:table-cell">Studio</th>
              <th className="text-right">Inscrits</th>
              <th className="hidden sm:table-cell">Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone2-100">
            {sessions.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-stone2-400">
                  Aucun cours programmé
                </td>
              </tr>
            )}
            {sessions.map((s) => {
              const confirmed = s.bookings.filter(
                (b) => b.status === "CONFIRMED"
              ).length;
              const waitlist = s.bookings.filter(
                (b) => b.status === "WAITLIST"
              ).length;
              return (
                <tr key={s.id}>
                  <td className="py-2 text-stone2-600 whitespace-nowrap">
                    {formatDateTime(s.startTime)}
                  </td>
                  <td className="font-medium">{s.classType.name}</td>
                  <td className="hidden md:table-cell text-stone2-600">
                    {s.instructor.firstName} {s.instructor.lastName}
                  </td>
                  <td className="hidden lg:table-cell text-stone2-600">{s.location.name}</td>
                  <td className="text-right">
                    {confirmed}/{s.capacity}
                    {waitlist > 0 && (
                      <span className="text-accent-600"> +{waitlist}</span>
                    )}
                  </td>
                  <td className="hidden sm:table-cell">
                    <span className="badge bg-stone2-100 text-stone2-700">
                      {STATUS_LABELS[s.status] ?? s.status}
                    </span>
                  </td>
                  <td className="text-right py-2">
                    <div className="flex justify-end gap-2">
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
                    </div>
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
