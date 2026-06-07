export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import InstructorCalendar from "./InstructorCalendar";

function startOfMonday(d: Date) {
  const day = d.getDay();
  const diff = (day + 6) % 7;
  const r = new Date(d);
  r.setDate(r.getDate() - diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toISO(d: Date) {
  return d.toISOString().split("T")[0];
}

export default async function InstructorCalendarPage({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  const me = await requireStaff();

  const base = searchParams.week ? new Date(searchParams.week + "T00:00:00") : new Date();
  const ws = startOfMonday(Number.isNaN(base.getTime()) ? new Date() : base);
  const we = addDays(ws, 7);

  const sessions = await db.session.findMany({
    where: {
      instructorId: me.id,
      startTime: { gte: ws, lt: we },
    },
    include: {
      classType: true,
      location: true,
      bookings: { where: { status: { in: ["CONFIRMED", "WAITLIST"] } } },
    },
    orderBy: { startTime: "asc" },
  });

  // Build 7-day grid
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = toISO(addDays(ws, i));
    return {
      date,
      sessions: sessions
        .filter((s) => toISO(s.startTime) === date)
        .map((s) => ({
          id: s.id,
          startTime: s.startTime.toISOString(),
          endTime: s.endTime.toISOString(),
          status: s.status,
          classType: {
            name: s.classType.name,
            color: s.classType.color,
            durationMin: s.classType.durationMin,
          },
          location: { name: s.location.name },
          confirmedCount: s.bookings.filter((b) => b.status === "CONFIRMED").length,
          waitlistCount: s.bookings.filter((b) => b.status === "WAITLIST").length,
          capacity: s.capacity,
        })),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="section-title">Espace instructeur</p>
        <h1 className="font-serif text-4xl font-medium text-brand-600 mt-1">Calendrier</h1>
      </div>
      <InstructorCalendar days={days} weekStart={toISO(ws)} />
    </div>
  );
}
