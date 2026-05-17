export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCachedClassTypes, getCachedLocations } from "@/lib/cached";
import { addDays, endOfDay, formatDate, startOfDay } from "@/lib/utils";
import ScheduleClient from "./ScheduleClient";

type SearchParams = { date?: string; location?: string; view?: string };

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  const view: "day" | "week" | "grid" =
    searchParams.view === "week"
      ? "week"
      : searchParams.view === "grid"
      ? "grid"
      : "day";

  const baseDate = searchParams.date ? new Date(searchParams.date) : new Date();
  if (Number.isNaN(baseDate.getTime())) baseDate.setTime(Date.now());

  let rangeStart: Date;
  let numDays: number;
  if (view === "grid") {
    const dow = baseDate.getDay();
    const diffToMonday = (dow + 6) % 7;
    rangeStart = startOfDay(addDays(baseDate, -diffToMonday));
    numDays = 7;
  } else if (view === "week") {
    rangeStart = startOfDay(baseDate);
    numDays = 7;
  } else {
    rangeStart = startOfDay(baseDate);
    numDays = 1;
  }

  const days = Array.from({ length: numDays }).map((_, i) =>
    startOfDay(addDays(rangeStart, i))
  );

  const [locations, classTypes] = await Promise.all([
    getCachedLocations(),
    getCachedClassTypes(),
  ]);
  const locationFilter = searchParams.location;

  const sessions = await db.session.findMany({
    where: {
      startTime: { gte: days[0], lte: endOfDay(days[days.length - 1]) },
      status: "SCHEDULED",
      ...(locationFilter ? { locationId: locationFilter } : {}),
    },
    include: {
      classType: true,
      instructor: { select: { id: true, firstName: true, lastName: true, instructorBio: true } },
      location: true,
      bookings: {
        select: { id: true, userId: true, status: true, waitlistPos: true },
      },
      checkIns: { select: { userId: true } },
    },
    orderBy: { startTime: "asc" },
  });

  const myBookingsMap = new Map<
    string,
    { id: string; status: string; waitlistPos: number | null }
  >();
  if (user) {
    for (const s of sessions) {
      const mine = s.bookings.find(
        (b) => b.userId === user.id && b.status !== "CANCELLED"
      );
      if (mine)
        myBookingsMap.set(s.id, {
          id: mine.id,
          status: mine.status,
          waitlistPos: mine.waitlistPos,
        });
    }
  }

  const grouped = days.map((d) => ({
    date: d,
    sessions: sessions.filter(
      (s) => s.startTime.toDateString() === d.toDateString()
    ),
  }));

  const enriched = grouped.map((g) => ({
    date: g.date.toISOString(),
    sessions: g.sessions.map((s) => {
      const confirmed = s.bookings.filter((b) => b.status === "CONFIRMED").length;
      const waitlist = s.bookings.filter((b) => b.status === "WAITLIST").length;
      const my = myBookingsMap.get(s.id) ?? null;
      return {
        id: s.id,
        startTime: s.startTime.toISOString(),
        endTime: s.endTime.toISOString(),
        capacity: s.capacity,
        confirmedCount: confirmed,
        waitlistCount: waitlist,
        classType: {
          id: s.classType.id,
          name: s.classType.name,
          color: s.classType.color,
          creditCost: s.classType.creditCost,
          durationMin: s.classType.durationMin,
          description: s.classType.description,
        },
        instructor: {
          id: s.instructor.id,
          name: `${s.instructor.firstName} ${s.instructor.lastName}`,
          firstName: s.instructor.firstName,
          bio: s.instructor.instructorBio,
        },
        location: { name: s.location.name, address: s.location.address },
        myBooking: my,
      };
    }),
  }));

  const navDelta = view === "day" ? 1 : 7;
  const prevDate = addDays(baseDate, -navDelta).toISOString().slice(0, 10);
  const nextDate = addDays(baseDate, navDelta).toISOString().slice(0, 10);

  const stripStart = startOfDay(addDays(baseDate, -3));
  const strip = Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(stripStart, i);
    return {
      iso: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("fr-FR", { weekday: "short" }),
      day: d.getDate(),
      isActive: d.toDateString() === baseDate.toDateString(),
      isToday: d.toDateString() === new Date().toDateString(),
    };
  });

  const headerLabel =
    view === "grid" || view === "week"
      ? `Semaine du ${formatDate(days[0])}`
      : formatDate(days[0]);

  const buildHref = (v: "day" | "week" | "grid") => {
    const dateParam = searchParams.date ? `&date=${searchParams.date}` : "";
    const locParam = locationFilter ? `&location=${locationFilter}` : "";
    return `/schedule?view=${v}${dateParam}${locParam}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-title">Studio Boutique</p>
          <h1 className="font-serif text-4xl md:text-5xl font-medium text-brand-600 mt-1">
            Planning
          </h1>
          <p className="text-sm text-stone2-500 capitalize mt-1">{headerLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* View toggle — hide "Grille" on mobile */}
          <div className="inline-flex border border-brand-600 bg-cream-50">
            {(["day", "week", "grid"] as const).map((v) => (
              <Link
                key={v}
                href={buildHref(v)}
                className={`px-4 min-h-[44px] flex items-center text-[10px] uppercase tracking-[0.18em] transition-colors ${
                  v === "grid" ? "hidden sm:flex" : ""
                } ${
                  view === v
                    ? "bg-brand-600 text-cream-50"
                    : "text-brand-600 hover:bg-cream-100"
                }`}
              >
                {v === "day" ? "Jour" : v === "week" ? "Semaine" : "Grille"}
              </Link>
            ))}
          </div>
          {/* Location filter */}
          {locations.length > 1 && (
            <form className="flex items-center gap-2">
              <select
                name="location"
                defaultValue={locationFilter ?? ""}
                className="input text-sm"
              >
                <option value="">Tous les studios</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <input type="hidden" name="date" value={searchParams.date ?? ""} />
              <input type="hidden" name="view" value={view} />
              <button className="btn-secondary py-2">Filtrer</button>
            </form>
          )}
        </div>
      </div>

      {/* Day strip */}
      <div className="flex items-center justify-between gap-2 bg-white border border-stone2-200 p-1.5">
        <Link
          href={`/schedule?view=${view}&date=${prevDate}${locationFilter ? `&location=${locationFilter}` : ""}`}
          className="btn-ghost px-4 min-h-[44px] flex items-center"
        >
          ←
        </Link>
        <div className="flex gap-0.5 overflow-x-auto">
          {strip.map((d) => (
            <Link
              key={d.iso}
              href={`/schedule?view=${view}&date=${d.iso}${locationFilter ? `&location=${locationFilter}` : ""}`}
              className={`flex flex-col items-center px-3 py-2 min-w-[48px] min-h-[44px] justify-center transition-colors ${
                d.isActive
                  ? "bg-brand-600 text-cream-50"
                  : d.isToday
                  ? "bg-accent-100 text-brand-600"
                  : "text-stone2-600 hover:bg-cream-100"
              }`}
            >
              <span className="text-[9px] uppercase tracking-widest">{d.label}</span>
              <span className="font-serif text-xl leading-tight">{d.day}</span>
            </Link>
          ))}
        </div>
        <Link
          href={`/schedule?view=${view}&date=${nextDate}${locationFilter ? `&location=${locationFilter}` : ""}`}
          className="btn-ghost px-4 min-h-[44px] flex items-center"
        >
          →
        </Link>
      </div>

      {!user && (
        <div className="bg-cream-100 border-l-4 border-accent-500 px-5 py-3">
          <p className="text-sm text-brand-600">
            <Link href="/login" className="font-semibold underline">Connectez-vous</Link>{" "}
            ou{" "}
            <Link href="/register" className="font-semibold underline">créez un compte</Link>{" "}
            pour réserver vos cours.
          </p>
        </div>
      )}

      <ScheduleClient
        days={enriched}
        classTypes={classTypes.map((ct) => ({
          id: ct.id,
          name: ct.name,
          color: ct.color,
        }))}
        userCredits={user?.creditsBalance ?? null}
        isLoggedIn={!!user}
        view={view}
        now={new Date().toISOString()}
      />
    </div>
  );
}
