import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { addDays, endOfDay, formatDate, startOfDay } from "@/lib/utils";
import ScheduleClient from "./ScheduleClient";

type SearchParams = { date?: string; location?: string };

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  const baseDate = searchParams.date
    ? new Date(searchParams.date)
    : new Date();
  if (Number.isNaN(baseDate.getTime())) baseDate.setTime(Date.now());

  const days = Array.from({ length: 7 }).map((_, i) =>
    startOfDay(addDays(baseDate, i))
  );

  const locations = await db.location.findMany({ orderBy: { name: "asc" } });
  const locationFilter = searchParams.location;

  const sessions = await db.session.findMany({
    where: {
      startTime: { gte: days[0], lte: endOfDay(days[6]) },
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

  const myBookingsMap = new Map<string, { id: string; status: string; waitlistPos: number | null }>();
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
      (s) =>
        s.startTime.toDateString() === d.toDateString()
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

  const prevDate = addDays(baseDate, -7).toISOString().slice(0, 10);
  const nextDate = addDays(baseDate, 7).toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Planning</h1>
          <p className="text-sm text-gray-500">
            Semaine du {formatDate(days[0])}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            <button className="btn-secondary">Filtrer</button>
          </form>
          <Link
            href={`/schedule?date=${prevDate}${
              locationFilter ? `&location=${locationFilter}` : ""
            }`}
            className="btn-ghost"
          >
            ← Semaine précédente
          </Link>
          <Link
            href={`/schedule?date=${nextDate}${
              locationFilter ? `&location=${locationFilter}` : ""
            }`}
            className="btn-ghost"
          >
            Semaine suivante →
          </Link>
        </div>
      </div>

      {!user && (
        <div className="card bg-brand-50 border-brand-200">
          <p className="text-sm text-brand-800">
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
      />
    </div>
  );
}
