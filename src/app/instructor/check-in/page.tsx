import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { formatTime } from "@/lib/utils";

export default async function CheckInPage() {
  const me = await requireStaff();
  const now = new Date();
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const sessions = await db.session.findMany({
    where: {
      startTime: { gte: oneHourAgo, lte: inOneHour },
      status: "SCHEDULED",
      ...(me.role === "ADMIN" ? {} : { instructorId: me.id }),
    },
    include: {
      classType: true,
      location: true,
      bookings: {
        where: { status: { in: ["CONFIRMED", "ATTENDED"] } },
      },
    },
    orderBy: { startTime: "asc" },
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Check-in</h2>
        <p className="text-sm text-gray-500">
          Cours dans la fenêtre ±1h. Cliquez sur un cours pour pointer les
          arrivées.
        </p>
      </div>
      {sessions.length === 0 ? (
        <p className="text-sm text-gray-500 italic">
          Aucun cours dans cette fenêtre horaire.
        </p>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => {
            const total = s.bookings.length;
            const attended = s.bookings.filter((b) => b.status === "ATTENDED").length;
            return (
              <Link
                key={s.id}
                href={`/instructor/sessions/${s.id}`}
                className="card flex items-center justify-between hover:border-brand-400"
              >
                <div>
                  <p className="font-semibold">{s.classType.name}</p>
                  <p className="text-sm text-gray-600">
                    {formatTime(s.startTime)} · {s.location.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-brand-600">
                    {attended}/{total}
                  </p>
                  <p className="text-xs text-gray-500">pointés</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
