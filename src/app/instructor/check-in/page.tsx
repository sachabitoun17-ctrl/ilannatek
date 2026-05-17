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
    <div className="space-y-6">
      <div>
        <p className="section-title">Espace pro</p>
        <h1 className="font-serif text-4xl font-medium text-brand-600 mt-0.5">Check-in</h1>
        <p className="text-sm text-stone2-500 mt-1">
          Cours dans la fenêtre ±1h. Cliquez sur un cours pour pointer les présences.
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="card text-center py-12">
          <p className="font-serif text-2xl text-stone2-400">Aucun cours dans cette fenêtre</p>
          <p className="text-sm text-stone2-500 mt-2">
            Les cours apparaissent entre 1h avant et 1h après leur heure de début.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const total = s.bookings.length;
            const attended = s.bookings.filter((b) => b.status === "ATTENDED").length;
            const pct = total > 0 ? Math.round((attended / total) * 100) : 0;
            const isNow = now >= s.startTime && now <= s.endTime;

            return (
              <Link
                key={s.id}
                href={`/instructor/sessions/${s.id}`}
                className="bg-white border border-stone2-200 hover:border-brand-600 transition-colors flex gap-0 overflow-hidden"
              >
                <div
                  className="w-1 shrink-0"
                  style={{ backgroundColor: s.classType.color }}
                />
                <div className="flex flex-1 flex-wrap items-center justify-between gap-4 p-5">
                  <div>
                    {isNow && (
                      <span className="inline-block text-[9px] uppercase tracking-widest bg-brand-600 text-cream-50 px-2 py-0.5 mb-2">
                        En cours
                      </span>
                    )}
                    <p className="font-serif text-xl text-brand-600">{s.classType.name}</p>
                    <p className="text-sm text-stone2-600 mt-0.5">
                      {formatTime(s.startTime)} · {s.location.name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-serif text-4xl text-brand-600 leading-none">
                      {attended}<span className="text-stone2-400 text-2xl">/{total}</span>
                    </p>
                    <p className="text-xs text-stone2-400 mt-0.5">pointés</p>
                    <div className="mt-2 h-1 w-20 bg-stone2-100 ml-auto">
                      <div
                        className="h-full bg-brand-600 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
