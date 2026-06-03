import Link from "next/link";
import { db } from "@/lib/db";
import { getCachedInstructors } from "@/lib/cached";
import { addDays, startOfDay } from "@/lib/utils";

export default async function InstructorsPage() {
  const now = new Date();
  const [instructors, upcomingSessions, allSessions] = await Promise.all([
    getCachedInstructors(),
    db.session.findMany({
      where: {
        startTime: { gte: startOfDay(now), lte: addDays(now, 30) },
        status: "SCHEDULED",
      },
      select: {
        instructorId: true,
        startTime: true,
        classType: { select: { name: true, color: true } },
      },
      orderBy: { startTime: "asc" },
    }),
    // For stats: all sessions taught (scheduled + past)
    db.session.findMany({
      where: { status: { in: ["SCHEDULED", "COMPLETED", "CANCELLED"] } },
      select: {
        id: true,
        instructorId: true,
        classTypeId: true,
        classType: { select: { name: true } },
        bookings: {
          where: { status: { in: ["CONFIRMED", "ATTENDED"] } },
          select: { userId: true },
        },
      },
    }),
  ]);

  // Group upcoming sessions by instructor
  const sessionsByInstructor = new Map<string, typeof upcomingSessions>();
  for (const s of upcomingSessions) {
    const existing = sessionsByInstructor.get(s.instructorId) ?? [];
    existing.push(s);
    sessionsByInstructor.set(s.instructorId, existing);
  }

  // Compute stats per instructor
  const statsMap = new Map<
    string,
    { totalSessions: number; totalStudents: number; specialties: string[] }
  >();

  for (const inst of instructors) {
    const mySessions = allSessions.filter((s) => s.instructorId === inst.id);
    const totalSessions = mySessions.length;

    // Unique students across all their sessions
    const studentSet = new Set<string>();
    for (const s of mySessions) {
      for (const b of s.bookings) {
        studentSet.add(b.userId);
      }
    }
    const totalStudents = studentSet.size;

    // Top 3 class types by session count
    const classTypeCounts = new Map<string, { name: string; count: number }>();
    for (const s of mySessions) {
      const existing = classTypeCounts.get(s.classTypeId);
      if (existing) {
        existing.count++;
      } else {
        classTypeCounts.set(s.classTypeId, { name: s.classType.name, count: 1 });
      }
    }
    const specialties = [...classTypeCounts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((x) => x.name);

    statsMap.set(inst.id, { totalSessions, totalStudents, specialties });
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
          const stats = statsMap.get(inst.id) ?? { totalSessions: 0, totalStudents: 0, specialties: [] };

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
                  <Link
                    href={`/instructors/${inst.id}`}
                    className="text-[10px] uppercase tracking-[0.15em] text-accent-500 hover:text-brand-600 transition-colors mt-1 block"
                  >
                    Voir le profil →
                  </Link>
                </div>

                {/* Stats */}
                <div className="flex gap-4 border-t border-stone2-200 pt-4 w-full justify-center">
                  <div className="text-center">
                    <p className="font-serif text-2xl text-brand-600">{stats.totalSessions}</p>
                    <p className="text-[9px] uppercase tracking-widest text-stone2-400">Séances</p>
                  </div>
                  <div className="text-center">
                    <p className="font-serif text-2xl text-brand-600">{stats.totalStudents}</p>
                    <p className="text-[9px] uppercase tracking-widest text-stone2-400">Élèves</p>
                  </div>
                </div>
              </div>

              {/* Bio + specialties + sessions */}
              <div className="space-y-6">
                {inst.instructorBio ? (
                  <p className="text-stone2-600 leading-relaxed">{inst.instructorBio}</p>
                ) : (
                  <p className="text-stone2-400 italic text-sm">Biographie à venir.</p>
                )}

                {/* Specialties */}
                {stats.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {stats.specialties.map((sp) => (
                      <span
                        key={sp}
                        className="text-[10px] uppercase tracking-[0.15em] px-3 py-1 bg-cream-50 border border-stone2-200 text-stone2-600"
                      >
                        {sp}
                      </span>
                    ))}
                  </div>
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
