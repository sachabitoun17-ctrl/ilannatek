import { db } from "@/lib/db";
import { createRecurringAction } from "./actions";
import { requireAdmin } from "@/lib/auth";

export default async function RecurringPage() {
  const user = await requireAdmin();
  const studioId = user.studioId ?? undefined;
  const [classTypes, instructors, locations] = await Promise.all([
    db.classType.findMany({ where: { studioId }, orderBy: { name: "asc" } }),
    db.user.findMany({
      where: { studioId, role: { in: ["ADMIN", "INSTRUCTOR"] } },
      orderBy: { firstName: "asc" },
    }),
    db.location.findMany({ where: { studioId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="section-title">Administration</p>
        <h1 className="font-serif text-4xl font-medium text-brand-600 mt-1">Cours récurrents</h1>
        <p className="text-sm text-stone2-500 mt-1">
          Génère automatiquement toutes les séances pour les jours sélectionnés
          entre les deux dates.
        </p>
      </div>

      <form action={createRecurringAction} className="card space-y-4 max-w-xl">
        <div>
          <label className="label">Type de cours</label>
          <select name="classTypeId" required className="input">
            <option value="">— sélectionner —</option>
            {classTypes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.durationMin}min)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Instructeur</label>
          <select name="instructorId" required className="input">
            <option value="">— sélectionner —</option>
            {instructors.map((i) => (
              <option key={i.id} value={i.id}>
                {i.firstName} {i.lastName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Studio</label>
          <select name="locationId" required className="input">
            <option value="">— sélectionner —</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Jours de la semaine</label>
          <div className="flex gap-2 flex-wrap">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d, i) => {
              const dayIdx = i === 6 ? 0 : i + 1;
              return (
                <label
                  key={d}
                  className="flex flex-col items-center text-xs cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    name="daysOfWeek"
                    value={dayIdx}
                    className="peer hidden"
                  />
                  <span className="px-3 py-2 border border-stone2-300 text-stone2-600 peer-checked:bg-brand-600 peer-checked:text-cream-50 peer-checked:border-brand-600 transition-colors">
                    {d}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Heure de début</label>
            <input type="time" name="startTime" required className="input" />
          </div>
          <div>
            <label className="label">Capacité</label>
            <input
              type="number"
              name="capacity"
              min={1}
              defaultValue={15}
              required
              className="input"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date début</label>
            <input type="date" name="startDate" required className="input" />
          </div>
          <div>
            <label className="label">Date fin</label>
            <input type="date" name="endDate" required className="input" />
          </div>
        </div>
        <button className="btn-primary w-full">Générer les séances</button>
      </form>
    </div>
  );
}
