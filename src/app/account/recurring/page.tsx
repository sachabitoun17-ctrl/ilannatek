export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import RecurringClient from "./RecurringClient";

const DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export default async function RecurringPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [slots, classTypes, locations] = await Promise.all([
    db.recurringSlot.findMany({
      where: { userId: user.id },
      include: { classType: true, location: true },
      orderBy: [{ active: "desc" }, { dayOfWeek: "asc" }, { startTimeMin: "asc" }],
    }),
    db.classType.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    db.location.findMany({ orderBy: { name: "asc" } }),
  ]);

  const serializedSlots = slots.map((s) => ({
    id: s.id,
    active: s.active,
    dayOfWeek: s.dayOfWeek,
    dayName: DAY_NAMES[s.dayOfWeek],
    startTimeMin: s.startTimeMin,
    startTimeLabel: formatTime(s.startTimeMin),
    classTypeId: s.classTypeId,
    classTypeName: s.classType.name,
    classTypeColor: s.classType.color,
    locationId: s.locationId,
    locationName: s.location?.name ?? null,
  }));

  const serializedClassTypes = classTypes.map((ct) => ({
    id: ct.id,
    name: ct.name,
    color: ct.color,
    creditCost: ct.creditCost,
  }));

  const serializedLocations = locations.map((l) => ({
    id: l.id,
    name: l.name,
  }));

  return (
    <div className="space-y-10">
      <div className="pb-8 border-b border-stone2-200">
        <p className="section-title">Mon espace</p>
        <h1 className="font-serif text-4xl md:text-5xl font-medium text-brand-600 mt-1">
          Créneaux récurrents
        </h1>
        <p className="text-sm text-stone2-500 mt-2 max-w-xl">
          Activez un créneau récurrent pour être automatiquement réservé chaque semaine.
          Le système vérifie quotidiennement les séances à venir et vous inscrit dès qu'une place est disponible.
        </p>
      </div>

      <RecurringClient
        slots={serializedSlots}
        classTypes={serializedClassTypes}
        locations={serializedLocations}
      />
    </div>
  );
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
