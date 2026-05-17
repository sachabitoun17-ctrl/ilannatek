import Link from "next/link";
import { db } from "@/lib/db";
import { addDays, startOfDay } from "@/lib/utils";

export default async function InstructorsPage() {
  const [instructors, upcomingSessions] = await Promise.all([
    db.user.findMany({
      where: { role: { in: ["INSTRUCTOR", "ADMIN"] }, active: true },
      orderBy: { firstName: "asc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        instructorBio: true,
        instructorPhoto: true,
      },
    }),
    db.session.findMany({
      where: {
        startTime: { gte: startOfDay(new Date()), lte: addDays(new Date(), 30) },
        status: "SCHEDULED",
      },
      select: {
        instructorId: true,
        startTime: true,
        classType: { select: { name: true, color: true } },
      },
      orderBy: { startTime: "asc" },
    }),
  ]);

  // Group sessions by instructor
  const sessionsByInstructor = new Map<string, typeof upcomingSessions>();
  for (const s of upcomingSessions) {
    const existing = sessionsByInstructor.get(s.instructorId) ?? [];
    existing.push(s);
    sessionsByInstructor.set(s.instructorId, existing);
  }

  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <p className="section-title">Studio Boutique</p>
        <h1 className="font-serif text-5xl md:text-6xl font-medium text-brand-600 mt-1 leading-none">
          L'équipe
        </h1>
        <p className="text-sm text-stone2-500 mt-3 max-w-xl">
          Des instructeurs certifiés, passionnés par leur pratique. Chaque cours est une invitation à aller plus loin.
        </p>
      </div>

      {/* Instructors */}
      <div className="space-y-0 divide-y divide-stone2-200 border-y border-stone2-200">
        {instructors.map((inst) => {
          const sessions = sessionsByInstructor.get(inst.id) ?? [];
          const nextSessions = sessions.slice(0, 3);
          const initials = `${inst.firstName[0]}${inst.lastName[0]}`;

          return (
            <div key={inst.id} className="py-10 md:py-12 grid md:grid-cols-[180px_1fr] gap-8 md:gap-16 items-start">
              {/* Avatar */}
              <div className="flex flex-col items-center text-center gap-4">
                {inst.instructorPhoto ? (
                  <img
                    src={inst.instructorPhoto}
                    alt={`${inst.firstName} ${inst.lastName}`}
                    className="w-28 h-28 object-cover border border-stone2-200"
                  />
                ) : (
                  <div className="w-28 h-28 bg-brand-600 flex items-center justify-center">
                    <span className="font-serif text-3xl text-cream-50">{initials}</span>
                  </div>
                )}
                <div>
                  <h2 className="font-serif text-2xl text-brand-600">
                    {inst.firstName} {inst.lastName}
                  </h2>
                </div>
              </div>

              {/* Bio + sessions */}
              <div className="space-y-6">
                {inst.instructorBio ? (
                  <p className="text-stone2-600 leading-relaxed">{inst.instructorBio}</p>
                ) : (
                  <p className="text-stone2-400 italic text-sm">Biographie à venir.</p>
                )}

                {nextSessions.length > 0 && (
                  <div>
                    <p className="section-title mb-3">Prochaines séances</p>
                    <div className="space-y-2">
                      {nextSessions.map((s, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div
                            className="w-1.5 h-8 shrink-0"
                            style={{ backgroundColor: s.classType.color }}
                          />
                          <div>
                            <p className="text-sm font-medium text-brand-600">{s.classType.name}</p>
                            <p className="text-xs text-stone2-500">
                              {s.startTime.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                              {" · "}
                              {s.startTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Link
                      href="/schedule"
                      className="inline-flex items-center mt-4 text-[11px] uppercase tracking-[0.18em] text-brand-600 border-b border-brand-600 pb-0.5 hover:text-accent-600 hover:border-accent-600 transition-colors"
                    >
                      Voir toutes les séances →
                    </Link>
                  </div>
                )}

                {nextSessions.length === 0 && (
                  <p className="text-xs text-stone2-400">Aucune séance prévue dans les 30 prochains jours.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {instructors.length === 0 && (
        <p className="text-stone2-400 text-sm text-center py-20">Aucun instructeur pour le moment.</p>
      )}
    </div>
  );
}
