import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { addDays, startOfDay } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
}

export default async function InstructorProfilePage({ params }: Props) {
  const now = new Date();
  const in14Days = addDays(now, 14);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [currentUser, instructor, allSessions, upcomingSessions] = await Promise.all([
    getCurrentUser(),
    db.user.findUnique({
      where: { id: params.id, role: { in: ["INSTRUCTOR", "ADMIN"] }, active: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        instructorBio: true,
        instructorPhoto: true,
      },
    }),
    // All sessions for stats
    db.session.findMany({
      where: {
        instructorId: params.id,
        status: { in: ["SCHEDULED", "COMPLETED", "CANCELLED"] },
      },
      select: {
        id: true,
        classTypeId: true,
        classType: { select: { name: true } },
        startTime: true,
        bookings: {
          where: { status: { in: ["CONFIRMED", "ATTENDED"] } },
          select: { userId: true },
        },
      },
    }),
    // Upcoming sessions (next 14 days)
    db.session.findMany({
      where: {
        instructorId: params.id,
        status: "SCHEDULED",
        startTime: { gte: startOfDay(now), lte: in14Days },
      },
      include: {
        classType: true,
        location: true,
        bookings: {
          where: { status: "CONFIRMED" },
          select: { id: true },
        },
      },
      orderBy: { startTime: "asc" },
    }),
  ]);

  if (!instructor) notFound();

  // Stats
  const totalSessions = allSessions.length;

  const studentSet = new Set<string>();
  for (const s of allSessions) {
    for (const b of s.bookings) {
      studentSet.add(b.userId);
    }
  }
  const totalStudents = studentSet.size;

  const sessionsThisMonth = allSessions.filter(
    (s) => s.startTime >= monthStart && s.startTime <= monthEnd
  ).length;

  // Specialties (top 3 class types)
  const classTypeCounts = new Map<string, { name: string; count: number }>();
  for (const s of allSessions) {
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

  const initials = `${instructor.firstName[0]}${instructor.lastName[0]}`;

  return (
    <div className="space-y-12 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="text-[11px] uppercase tracking-[0.18em] text-stone2-400 flex items-center gap-2">
        <Link href="/instructors" className="hover:text-brand-600 transition-colors">
          L'équipe
        </Link>
        <span>/</span>
        <span className="text-brand-600">{instructor.firstName} {instructor.lastName}</span>
      </nav>

      {/* Header */}
      <div className="grid md:grid-cols-[200px_1fr] gap-10 items-start">
        {/* Avatar */}
        <div className="flex flex-col items-center text-center gap-4">
          {instructor.instructorPhoto ? (
            <img
              src={instructor.instructorPhoto}
              alt={`${instructor.firstName} ${instructor.lastName}`}
              className="w-36 h-36 object-cover border border-stone2-200"
            />
          ) : (
            <div className="w-36 h-36 bg-brand-600 flex items-center justify-center">
              <span className="font-serif text-5xl text-cream-50">{initials}</span>
            </div>
          )}
        </div>

        {/* Name + bio */}
        <div className="space-y-4">
          <div>
            <p className="section-title">Instructeur</p>
            <h1 className="font-serif text-4xl md:text-5xl font-medium text-brand-600 mt-1 leading-none">
              {instructor.firstName} {instructor.lastName}
            </h1>
          </div>

          {specialties.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {specialties.map((sp) => (
                <span
                  key={sp}
                  className="text-[10px] uppercase tracking-[0.15em] px-3 py-1 bg-cream-50 border border-stone2-200 text-stone2-600"
                >
                  {sp}
                </span>
              ))}
            </div>
          )}

          {instructor.instructorBio ? (
            <p className="text-stone2-600 leading-relaxed">{instructor.instructorBio}</p>
          ) : (
            <p className="text-stone2-400 italic text-sm">Biographie à venir.</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-stretch divide-x divide-stone2-200 border border-stone2-200 bg-white">
        {[
          { value: totalSessions, label: "Séances enseignées" },
          { value: totalStudents, label: "Élèves uniques" },
          { value: sessionsThisMonth, label: "Ce mois-ci" },
        ].map(({ value, label }) => (
          <div key={label} className="flex-1 flex flex-col items-center justify-center py-6 px-4 text-center">
            <span className="font-serif text-4xl font-medium text-brand-600 leading-none">{value}</span>
            <span className="text-[9px] uppercase tracking-[0.2em] text-stone2-400 mt-2">{label}</span>
          </div>
        ))}
      </div>

      {/* Upcoming sessions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="section-title">Prochaines séances (14 jours)</p>
          <Link
            href="/schedule"
            className="text-[11px] uppercase tracking-[0.18em] text-brand-600 border-b border-brand-600 pb-0.5 hover:text-accent-600 hover:border-accent-600 transition-colors"
          >
            Voir le planning complet →
          </Link>
        </div>

        {upcomingSessions.length === 0 ? (
          <p className="text-sm text-stone2-400 py-6">Aucune séance prévue dans les 14 prochains jours.</p>
        ) : (
          <div className="space-y-3">
            {upcomingSessions.map((session) => {
              const spotsLeft = session.capacity - session.bookings.length;
              return (
                <div
                  key={session.id}
                  className="flex flex-wrap items-center justify-between gap-4 border border-stone2-200 bg-white p-5"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-1.5 self-stretch min-h-[40px] shrink-0"
                      style={{ backgroundColor: session.classType.color }}
                    />
                    <div>
                      <p className="font-medium text-brand-600">{session.classType.name}</p>
                      <p className="text-sm text-stone2-500 mt-0.5">
                        {session.startTime.toLocaleDateString("fr-FR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                        {" · "}
                        {session.startTime.toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" · "}
                        {session.location.name}
                      </p>
                      <p className="text-xs text-stone2-400 mt-0.5">
                        {session.classType.durationMin} min
                        {" · "}
                        {spotsLeft > 0
                          ? `${spotsLeft} place${spotsLeft > 1 ? "s" : ""} disponible${spotsLeft > 1 ? "s" : ""}`
                          : "Complet"}
                      </p>
                    </div>
                  </div>

                  {currentUser ? (
                    <Link
                      href={`/schedule?date=${session.startTime.toISOString().slice(0, 10)}`}
                      className="btn-secondary text-sm shrink-0"
                    >
                      Réserver
                    </Link>
                  ) : (
                    <Link href="/login" className="btn-secondary text-sm shrink-0">
                      Se connecter
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
