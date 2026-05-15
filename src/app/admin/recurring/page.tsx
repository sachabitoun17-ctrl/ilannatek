import { db } from "@/lib/db";
import { createRecurringAction } from "./actions";

export default async function RecurringPage() {
  const [classTypes, instructors, locations] = await Promise.all([
    db.classType.findMany({ orderBy: { name: "asc" } }),
    db.user.findMany({
      where: { role: { in: ["ADMIN", "INSTRUCTOR"] } },
      orderBy: { firstName: "asc" },
    }),
    db.location.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Créer des séances récurrentes</h1>
        <p className="text-sm text-gray-500">
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
          <div className="flex gap-2">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d, i) => {
              const dayIdx = i === 6 ? 0 : i + 1; // map to Sunday=0..Saturday=6
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
                  <span className="px-3 py-2 rounded border border-gray-300 peer-checked:bg-brand-600 peer-checked:text-white peer-checked:border-brand-600">
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
