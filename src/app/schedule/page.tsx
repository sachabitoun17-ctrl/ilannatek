import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
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

  // For "grid" view, start at Monday of the week containing baseDate
  let rangeStart: Date;
  let numDays: number;
  if (view === "grid") {
    const dow = baseDate.getDay(); // 0=Sun..6=Sat
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

  const locations = await db.location.findMany({ orderBy: { name: "asc" } });
  const locationFilter = searchParams.location;

  const sessions = await db.session.findMany({
    where: {
      startTime: { gte: days[0], lte: endOfDay(days[days.length - 1]) },
      status: "SCHEDULED",
      ...(locationFilter ? { locationId: locationFilter } : {}),
    },
    include: {
      classType: true,
      instructor: { select: { firstName: true, lastName: true } },
      location: true,
      bookings: {
        select: { id: true, userId: true, status: true, waitlistPos: true },
      },
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
      if (mine) {
        myBookingsMap.set(s.id, {
          id: mine.id,
          status: mine.status,
          waitlistPos: mine.waitlistPos,
        });
      }
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
          name: s.classType.name,
          color: s.classType.color,
          creditCost: s.classType.creditCost,
          durationMin: s.classType.durationMin,
        },
        instructor: `${s.instructor.firstName} ${s.instructor.lastName}`,
        location: s.location.name,
        myBooking: my,
      };
    }),
  }));

  const navDelta = view === "day" ? 1 : 7;
  const prevDate = addDays(baseDate, -navDelta).toISOString().slice(0, 10);
  const nextDate = addDays(baseDate, navDelta).toISOString().slice(0, 10);

  // Build the day strip for quick navigation (7 days centered on baseDate)
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
    view === "grid"
      ? `Semaine du ${formatDate(days[0])}`
      : view === "week"
      ? `Semaine du ${formatDate(days[0])}`
      : formatDate(days[0]);

  const buildHref = (v: "day" | "week" | "grid") => {
    const dateParam = searchParams.date ? `&date=${searchParams.date}` : "";
    const locParam = locationFilter ? `&location=${locationFilter}` : "";
    return `/schedule?view=${v}${dateParam}${locParam}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-title">Studio Boutique</p>
          <h1 className="font-serif text-4xl md:text-5xl font-medium text-brand-600 mt-1">
            Planning
          </h1>
          <p className="text-sm text-stone2-500 capitalize mt-1">{headerLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex border border-brand-600 bg-cream-50">
            {(["day", "week", "grid"] as const).map((v) => (
              <Link
                key={v}
                href={buildHref(v)}
                className={`px-4 py-2 text-[10px] uppercase tracking-[0.18em] ${
                  view === v
                    ? "bg-brand-600 text-cream-50"
                    : "text-brand-600 hover:bg-cream-100"
                }`}
              >
                {v === "day" ? "Jour" : v === "week" ? "Semaine" : "Grille"}
              </Link>
            ))}
          </div>
          <form className="flex items-center gap-2">
            <select
              name="location"
              defaultValue={locationFilter ?? ""}
              className="input"
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
            <button className="btn-secondary">Filtrer</button>
          </form>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 bg-white border border-stone2-200 p-2">
        <Link
          href={`/schedule?view=${view}&date=${prevDate}${
            locationFilter ? `&location=${locationFilter}` : ""
          }`}
          className="btn-ghost"
        >
          ←
        </Link>
        <div className="flex gap-1 overflow-x-auto">
          {strip.map((d) => (
            <Link
              key={d.iso}
              href={`/schedule?view=${view}&date=${d.iso}${
                locationFilter ? `&location=${locationFilter}` : ""
              }`}
              className={`flex flex-col items-center px-3 py-2 min-w-[64px] transition-colors ${
                d.isActive
                  ? "bg-brand-600 text-cream-50"
                  : d.isToday
                  ? "bg-accent-100 text-brand-600"
                  : "text-stone2-600 hover:bg-cream-100"
              }`}
            >
              <span className="text-[10px] uppercase tracking-widest">
                {d.label}
              </span>
              <span className="font-serif text-xl">{d.day}</span>
            </Link>
          ))}
        </div>
        <Link
          href={`/schedule?view=${view}&date=${nextDate}${
            locationFilter ? `&location=${locationFilter}` : ""
          }`}
          className="btn-ghost"
        >
          →
        </Link>
      </div>

      {!user && (
        <div className="bg-accent-50 border border-accent-200 px-5 py-4">
          <p className="text-sm text-brand-600">
            <Link href="/login" className="font-semibold underline">
              Connectez-vous
            </Link>{" "}
            ou{" "}
            <Link href="/register" className="font-semibold underline">
              créez un compte
            </Link>{" "}
            pour réserver vos cours.
          </p>
        </div>
      )}

      <ScheduleClient
        days={enriched}
        userCredits={user?.creditsBalance ?? null}
        isLoggedIn={!!user}
        view={view}
      />
    </div>
  );
}
