import Link from "next/link";
import { db } from "@/lib/db";
import { getCachedClassTypes } from "@/lib/cached";
import { addDays, startOfDay } from "@/lib/utils";

export default async function ClassesPage() {
  const [classTypes, upcomingSessions] = await Promise.all([
    getCachedClassTypes(),
    db.session.findMany({
      where: {
        startTime: { gte: startOfDay(new Date()), lte: addDays(new Date(), 14) },
        status: "SCHEDULED",
      },
      select: { classTypeId: true, startTime: true, bookings: { where: { status: "CONFIRMED" }, select: { id: true } }, capacity: true },
      orderBy: { startTime: "asc" },
    }),
  ]);

  // Count upcoming sessions per class type
  const sessionsByType = new Map<string, { count: number; nextDate?: Date }>();
  for (const s of upcomingSessions) {
    const existing = sessionsByType.get(s.classTypeId);
    if (!existing) {
      sessionsByType.set(s.classTypeId, { count: 1, nextDate: s.startTime });
    } else {
      existing.count++;
    }
  }

  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <p className="section-title">Studio Boutique</p>
        <h1 className="font-serif text-5xl md:text-6xl font-medium text-brand-600 mt-1 leading-none">
          Nos cours
        </h1>
        <p className="text-sm text-stone2-500 mt-3 max-w-xl">
          Découvrez toutes nos pratiques — yoga, pilates, danse, méditation et plus encore.
          Chaque cours est dispensé par un instructeur certifié, dans des classes à taille humaine.
        </p>
      </div>

      {/* Class type grid */}
      <div className="grid md:grid-cols-2 gap-px bg-stone2-200 border border-stone2-200">
        {classTypes.map((ct) => {
          const info = sessionsByType.get(ct.id);
          return (
            <div key={ct.id} className="bg-cream-50 p-8 md:p-10 hover:bg-white transition-colors group">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div
                  className="h-1 w-16 mt-3 shrink-0"
                  style={{ backgroundColor: ct.color }}
                />
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] uppercase tracking-widest text-stone2-400">
                    {ct.durationMin} min
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-stone2-400">
                    {ct.creditCost} crédit{ct.creditCost > 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <h2 className="font-serif text-3xl md:text-4xl font-medium text-brand-600 mb-3">
                {ct.name}
              </h2>

              {ct.description && (
                <p className="text-stone2-600 text-sm leading-relaxed mb-6">
                  {ct.description}
                </p>
              )}

              {info && (
                <p className="text-xs text-stone2-500 mb-6">
                  <span className="font-medium text-brand-600">{info.count}</span> séance{info.count > 1 ? "s" : ""} dans les 14 prochains jours
                  {info.nextDate && (
                    <> · Prochain :{" "}
                      <strong>
                        {info.nextDate.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                      </strong>
                    </>
                  )}
                </p>
              )}

              <Link
                href={`/schedule`}
                className="inline-flex items-center text-[11px] uppercase tracking-[0.18em] text-brand-600 border-b border-brand-600 pb-0.5 hover:text-accent-600 hover:border-accent-600 transition-colors group-hover:translate-x-1 transform transition-transform"
              >
                Voir les séances →
              </Link>
            </div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="text-center py-10 border-t border-stone2-200">
        <p className="font-serif text-2xl text-brand-600 mb-2">Prêt·e à commencer ?</p>
        <p className="text-stone2-500 text-sm mb-6">Un crédit, une séance. Simple.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/schedule" className="btn-primary">Voir le planning</Link>
          <Link href="/packs" className="btn-secondary">Acheter des crédits</Link>
        </div>
      </div>
    </div>
  );
}
