"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addRecurringSlot, removeRecurringSlot } from "./actions";

const DAY_OPTIONS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" },
];

// Common class hours in minutes from midnight
const TIME_OPTIONS = [
  { value: 360, label: "06:00" },
  { value: 390, label: "06:30" },
  { value: 420, label: "07:00" },
  { value: 450, label: "07:30" },
  { value: 480, label: "08:00" },
  { value: 510, label: "08:30" },
  { value: 540, label: "09:00" },
  { value: 570, label: "09:30" },
  { value: 600, label: "10:00" },
  { value: 630, label: "10:30" },
  { value: 660, label: "11:00" },
  { value: 690, label: "11:30" },
  { value: 720, label: "12:00" },
  { value: 780, label: "13:00" },
  { value: 900, label: "15:00" },
  { value: 960, label: "16:00" },
  { value: 1020, label: "17:00" },
  { value: 1050, label: "17:30" },
  { value: 1080, label: "18:00" },
  { value: 1110, label: "18:30" },
  { value: 1140, label: "19:00" },
  { value: 1170, label: "19:30" },
  { value: 1200, label: "20:00" },
  { value: 1230, label: "20:30" },
];

type Slot = {
  id: string;
  active: boolean;
  dayOfWeek: number;
  dayName: string;
  startTimeMin: number;
  startTimeLabel: string;
  classTypeId: string;
  classTypeName: string;
  classTypeColor: string;
  locationId: string | null;
  locationName: string | null;
};

type ClassType = {
  id: string;
  name: string;
  color: string;
  creditCost: number;
};

type Location = {
  id: string;
  name: string;
};

export default function RecurringClient({
  slots,
  classTypes,
  locations,
}: {
  slots: Slot[];
  classTypes: ClassType[];
  locations: Location[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  // Form state
  const [classTypeId, setClassTypeId] = useState(classTypes[0]?.id ?? "");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTimeMin, setStartTimeMin] = useState(TIME_OPTIONS[4].value); // 08:00
  const [locationId, setLocationId] = useState("");

  const activeSlots = slots.filter((s) => s.active);
  const inactiveSlots = slots.filter((s) => !s.active);

  const showMessage = (type: "ok" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleAdd = () => {
    if (!classTypeId) return;
    startTransition(async () => {
      const res = await addRecurringSlot(
        classTypeId,
        dayOfWeek,
        startTimeMin,
        locationId || undefined
      );
      if (res.ok) {
        showMessage("ok", "Créneau récurrent activé.");
        router.refresh();
      } else {
        showMessage("error", res.error ?? "Erreur");
      }
    });
  };

  const handleRemove = (slotId: string) => {
    startTransition(async () => {
      const res = await removeRecurringSlot(slotId);
      if (res.ok) {
        showMessage("ok", "Créneau désactivé.");
        router.refresh();
      } else {
        showMessage("error", res.error ?? "Erreur");
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Feedback */}
      {message && (
        <div
          className={`px-4 py-3 text-sm border ${
            message.type === "ok"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Active slots */}
      <div>
        <h2 className="section-title mb-4">Créneaux actifs</h2>
        {activeSlots.length === 0 ? (
          <div className="border border-stone2-200 bg-white px-6 py-10 text-center">
            <p className="font-serif text-xl text-stone2-400">Aucun créneau récurrent</p>
            <p className="text-sm text-stone2-500 mt-2">
              Ajoutez un créneau ci-dessous pour être réservé automatiquement chaque semaine.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeSlots.map((slot) => (
              <div
                key={slot.id}
                className="bg-white border border-stone2-200 flex flex-wrap items-center gap-4 px-5 py-4"
              >
                {/* Color dot */}
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: slot.classTypeColor }}
                />

                {/* Details */}
                <div className="flex-1 min-w-[180px]">
                  <p className="font-medium text-brand-600 text-sm">{slot.classTypeName}</p>
                  <p className="text-xs text-stone2-500 mt-0.5">
                    {slot.dayName} · {slot.startTimeLabel}
                    {slot.locationName && ` · ${slot.locationName}`}
                  </p>
                </div>

                {/* Actions */}
                <button
                  onClick={() => handleRemove(slot.id)}
                  disabled={pending}
                  className="text-[10px] uppercase tracking-[0.15em] text-stone2-400 hover:text-red-700 transition-colors shrink-0"
                >
                  Désactiver
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add form */}
      <div className="bg-white border border-stone2-200 p-6 md:p-8">
        <h2 className="section-title mb-6">Ajouter un créneau récurrent</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Class type */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.15em] text-stone2-500 mb-1.5">
              Type de cours
            </label>
            <select
              value={classTypeId}
              onChange={(e) => setClassTypeId(e.target.value)}
              className="w-full border border-stone2-300 bg-cream-50 px-3 py-2.5 text-sm text-brand-600 focus:outline-none focus:border-brand-600"
            >
              {classTypes.map((ct) => (
                <option key={ct.id} value={ct.id}>
                  {ct.name} ({ct.creditCost} crédit{ct.creditCost > 1 ? "s" : ""})
                </option>
              ))}
            </select>
          </div>

          {/* Day of week */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.15em] text-stone2-500 mb-1.5">
              Jour
            </label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className="w-full border border-stone2-300 bg-cream-50 px-3 py-2.5 text-sm text-brand-600 focus:outline-none focus:border-brand-600"
            >
              {DAY_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {/* Time */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.15em] text-stone2-500 mb-1.5">
              Heure
            </label>
            <select
              value={startTimeMin}
              onChange={(e) => setStartTimeMin(Number(e.target.value))}
              className="w-full border border-stone2-300 bg-cream-50 px-3 py-2.5 text-sm text-brand-600 focus:outline-none focus:border-brand-600"
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Location (optional) */}
          {locations.length > 0 && (
            <div>
              <label className="block text-[11px] uppercase tracking-[0.15em] text-stone2-500 mb-1.5">
                Studio <span className="text-stone2-400 normal-case">(optionnel)</span>
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full border border-stone2-300 bg-cream-50 px-3 py-2.5 text-sm text-brand-600 focus:outline-none focus:border-brand-600"
              >
                <option value="">Tous les studios</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="mt-6">
          <button
            onClick={handleAdd}
            disabled={pending || !classTypeId}
            className="btn-primary disabled:opacity-50"
          >
            {pending ? "Activation…" : "Activer ce créneau →"}
          </button>
        </div>

        <p className="text-xs text-stone2-400 mt-4">
          Le système vérifie chaque jour les séances des 7 à 14 prochains jours
          correspondant à ce créneau et vous réserve automatiquement si une place est disponible.
        </p>
      </div>

      {/* Inactive slots (history) */}
      {inactiveSlots.length > 0 && (
        <div>
          <h2 className="section-title mb-3">Créneaux désactivés</h2>
          <div className="space-y-2">
            {inactiveSlots.map((slot) => (
              <div
                key={slot.id}
                className="bg-stone2-50 border border-stone2-200 flex flex-wrap items-center gap-4 px-5 py-3 opacity-60"
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0 opacity-50"
                  style={{ backgroundColor: slot.classTypeColor }}
                />
                <div className="flex-1 min-w-[180px]">
                  <p className="text-sm text-stone2-500">{slot.classTypeName}</p>
                  <p className="text-xs text-stone2-400 mt-0.5">
                    {slot.dayName} · {slot.startTimeLabel}
                    {slot.locationName && ` · ${slot.locationName}`}
                  </p>
                </div>
                <span className="text-[10px] uppercase tracking-[0.15em] text-stone2-400">
                  Désactivé
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
