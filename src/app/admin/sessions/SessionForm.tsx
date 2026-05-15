import { db } from "@/lib/db";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  defaults?: {
    classTypeId?: string;
    instructorId?: string;
    locationId?: string;
    startTime?: string;
    capacity?: number;
    status?: string;
    notes?: string | null;
  };
  showStatus?: boolean;
};

export default async function SessionForm({
  action,
  defaults,
  showStatus,
}: Props) {
  const [classTypes, instructors, locations] = await Promise.all([
    db.classType.findMany({ orderBy: { name: "asc" } }),
    db.user.findMany({
      where: { role: { in: ["ADMIN", "INSTRUCTOR"] } },
      orderBy: { firstName: "asc" },
    }),
    db.location.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <form action={action} className="card space-y-4 max-w-xl">
      <div>
        <label className="label">Type de cours</label>
        <select
          name="classTypeId"
          required
          defaultValue={defaults?.classTypeId ?? ""}
          className="input"
        >
          <option value="">— sélectionner —</option>
          {classTypes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.durationMin}min, {c.creditCost} crédit
              {c.creditCost > 1 ? "s" : ""})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Instructeur</label>
        <select
          name="instructorId"
          required
          defaultValue={defaults?.instructorId ?? ""}
          className="input"
        >
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
        <select
          name="locationId"
          required
          defaultValue={defaults?.locationId ?? ""}
          className="input"
        >
          <option value="">— sélectionner —</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Date & heure</label>
          <input
            type="datetime-local"
            name="startTime"
            required
            defaultValue={defaults?.startTime ?? ""}
            className="input"
          />
        </div>
        <div>
          <label className="label">Capacité</label>
          <input
            type="number"
            name="capacity"
            min={1}
            max={500}
            required
            defaultValue={defaults?.capacity ?? 15}
            className="input"
          />
        </div>
      </div>
      {showStatus && (
        <div>
          <label className="label">Statut</label>
          <select
            name="status"
            defaultValue={defaults?.status ?? "SCHEDULED"}
            className="input"
          >
            <option value="SCHEDULED">Programmé</option>
            <option value="CANCELLED">Annulé</option>
            <option value="COMPLETED">Terminé</option>
          </select>
        </div>
      )}
      <div>
        <label className="label">Notes (optionnel)</label>
        <textarea
          name="notes"
          defaultValue={defaults?.notes ?? ""}
          rows={2}
          className="input"
        />
      </div>
      <button className="btn-primary w-full">Enregistrer</button>
    </form>
  );
}
