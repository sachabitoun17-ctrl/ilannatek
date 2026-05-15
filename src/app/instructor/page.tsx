import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";

export default async function InstructorDashboard() {
  const me = await requireStaff();
  const now = new Date();
  const upcoming = await db.session.findMany({
    where: {
      instructorId: me.id,
      startTime: { gte: now },
      status: "SCHEDULED",
    },
    include: {
      classType: true,
      location: true,
      bookings: {
        where: { status: { in: ["CONFIRMED", "WAITLIST"] } },
      },
    },
    orderBy: { startTime: "asc" },
    take: 30,
  });

  const past = await db.session.findMany({
    where: { instructorId: me.id, startTime: { lt: now } },
    include: {
      classType: true,
      bookings: { where: { status: { in: ["ATTENDED", "NO_SHOW"] } } },
    },
    orderBy: { startTime: "desc" },
    take: 5,
  });

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold mb-3">Mes prochains cours</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Aucun cours à venir.</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((s) => {
              const confirmed = s.bookings.filter((b) => b.status === "CONFIRMED").length;
              const waitlist = s.bookings.filter((b) => b.status === "WAITLIST").length;
              return (
                <Link
                  key={s.id}
                  href={`/instructor/sessions/${s.id}`}
                  className="card flex flex-wrap items-center justify-between gap-3 hover:border-brand-400 transition-colors"
                >
                  <div>
                    <p className="font-medium">{s.classType.name}</p>
                    <p className="text-sm text-gray-600">
                      {formatDateTime(s.startTime)} · {s.location.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {confirmed}/{s.capacity}
                      {waitlist > 0 && (
                        <span className="text-amber-600"> +{waitlist}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">inscrits</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Historique récent</h2>
        {past.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Aucun historique.</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="py-2">Date</th>
                  <th>Cours</th>
                  <th className="text-right">Présents</th>
                  <th className="text-right">Absents</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {past.map((s) => {
                  const attended = s.bookings.filter((b) => b.status === "ATTENDED").length;
                  const noShow = s.bookings.filter((b) => b.status === "NO_SHOW").length;
                  return (
                    <tr key={s.id}>
                      <td className="py-2">{formatDateTime(s.startTime)}</td>
                      <td>{s.classType.name}</td>
                      <td className="text-right text-green-700">{attended}</td>
                      <td className="text-right text-amber-700">{noShow}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
