export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCachedClassTypes, getCachedLocations } from "@/lib/cached";
import { addDays, endOfDay, formatDate, startOfDay } from "@/lib/utils";
import ScheduleClient from "./ScheduleClient";
import PourVousStrip from "./PourVousStrip";

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

  type PourVousSession = {
    id: string;
    startTime: string;
    classTypeName: string;
    classTypeColor: string;
    instructorFirstName: string;
    myBooking: { id: string; status: string; waitlistPos: number | null } | null;
  };

  let pourVousSessions: PourVousSession[] = [];
  let pourVousLabels: string[] = [];

  if (user) {
    const since60 = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const recentBookings = await db.booking.findMany({
      where: {
        userId: user.id,
        status: "CONFIRMED",
        session: { startTime: { gte: since60 } },
      },
      include: { session: { select: { classTypeId: true } } },
    });

    const counts = new Map<string, number>();
    for (const b of recentBookings) {
      const id = b.session.classTypeId;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }

    const top2 = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([id]) => id);

    if (top2.length > 0) {
      const matching = sessions.filter((s) => top2.includes(s.classType.id));
      const nameMap = new Map(classTypes.map((ct) => [ct.id, ct.name]));
      pourVousLabels = top2.map((id) => nameMap.get(id) ?? "").filter(Boolean);
      pourVousSessions = matching.map((s) => ({
        id: s.id,
        startTime: s.startTime.toISOString(),
        classTypeName: s.classType.name,
        classTypeColor: s.classType.color,
        instructorFirstName: s.instructor.firstName,
        myBooking: myBookingsMap.get(s.id) ?? null,
      }));
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
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-2">
        <div>
          <p className="section-title">Studio Boutique</p>
          <h1 className="font-serif text-4xl md:text-5xl font-medium text-brand-600 mt-1 leading-tight">
            Planning
          </h1>
          <p className="text-sm text-stone2-500 capitalize mt-1">{headerLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* View toggle */}
          <div className="inline-flex bg-white border border-stone2-200">
            {(["day", "week", "grid"] as const).map((v) => (
              <Link
                key={v}
                href={buildHref(v)}
                className={`px-4 min-h-[40px] flex items-center text-[10px] uppercase tracking-[0.18em] transition-colors border-r border-stone2-200 last:border-r-0 ${
                  v === "grid" ? "hidden sm:flex" : ""
                } ${
                  view === v
                    ? "bg-brand-600 text-cream-50"
                    : "text-stone2-600 hover:bg-cream-50 hover:text-brand-600"
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
                className="input text-sm h-10 py-0"
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
              <button className="btn-secondary h-10 py-0 text-xs">Filtrer</button>
            </form>
          )}
        </div>
      </div>

      {/* Date navigation strip */}
      <div className="bg-white border border-stone2-200 flex items-stretch">
        <Link
          href={`/schedule?view=${view}&date=${prevDate}${locationFilter ? `&location=${locationFilter}` : ""}`}
          className="flex items-center justify-center px-4 min-h-[60px] text-stone2-500 hover:text-brand-600 hover:bg-cream-50 transition-colors border-r border-stone2-200 text-lg"
          aria-label="Semaine précédente"
        >
          ←
        </Link>
        <div className="flex flex-1 overflow-x-auto">
          {strip.map((d) => (
            <Link
              key={d.iso}
              href={`/schedule?view=${view}&date=${d.iso}${locationFilter ? `&location=${locationFilter}` : ""}`}
              className={`flex flex-col items-center justify-center flex-1 min-w-[52px] min-h-[60px] py-2.5 gap-0.5 transition-colors ${
                d.isActive
                  ? "bg-brand-600 text-cream-50"
                  : d.isToday
                  ? "bg-accent-50 text-brand-600 border-b-2 border-accent-400"
                  : "text-stone2-500 hover:bg-cream-50 hover:text-brand-600"
              }`}
            >
              <span className="text-[9px] uppercase tracking-widest font-medium capitalize">{d.label}</span>
              <span className={`font-serif text-2xl leading-none ${d.isActive ? "text-cream-50" : "text-brand-600"}`}>
                {d.day}
              </span>
            </Link>
          ))}
        </div>
        <Link
          href={`/schedule?view=${view}&date=${nextDate}${locationFilter ? `&location=${locationFilter}` : ""}`}
          className="flex items-center justify-center px-4 min-h-[60px] text-stone2-500 hover:text-brand-600 hover:bg-cream-50 transition-colors border-l border-stone2-200 text-lg"
          aria-label="Semaine suivante"
        >
          →
        </Link>
      </div>

      {!user && (
        <div className="bg-brand-600 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-cream-50">
            Connectez-vous pour réserver vos cours.
          </p>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-[11px] uppercase tracking-[0.18em] text-accent-300 hover:text-cream-50 transition-colors font-medium">
              Se connecter
            </Link>
            <Link href="/register" className="text-[11px] uppercase tracking-[0.18em] px-4 py-2 bg-cream-50 text-brand-600 hover:bg-accent-200 transition-colors font-semibold">
              Créer un compte
            </Link>
          </div>
        </div>
      )}

      {user && pourVousSessions.length > 0 && (
        <PourVousStrip
          sessions={pourVousSessions}
          labels={pourVousLabels}
          userCredits={user.creditsBalance}
        />
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
