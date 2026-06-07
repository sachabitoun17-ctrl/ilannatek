export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatPrice } from "@/lib/utils";
import { FreezeButton, UnfreezeButton } from "./SubscriptionActions";
import AccountTabs from "./AccountTabs";

// ─── Streak helpers ───────────────────────────────────────────────────────────

/** Returns the Monday of the ISO week containing `d` */
function weekStart(d: Date): Date {
  const day = new Date(d);
  const dow = day.getDay(); // 0 = Sunday
  const diff = (dow + 6) % 7; // offset to Monday
  day.setDate(day.getDate() - diff);
  day.setHours(0, 0, 0, 0);
  return day;
}

function computeStreak(confirmedBookings: { startTime: Date }[]): number {
  // Build a set of week-start timestamps (Monday) that have at least 1 course
  const weeksWithCourse = new Set<number>();
  for (const b of confirmedBookings) {
    weeksWithCourse.add(weekStart(b.startTime).getTime());
  }

  let streak = 0;
  const now = new Date();
  // Start from the current week and walk backwards
  let cursor = weekStart(now);
  while (weeksWithCourse.has(cursor.getTime())) {
    streak++;
    cursor = new Date(cursor.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  return streak;
}

function googleCalLink(booking: {
  classTypeName: string;
  startTime: Date;
  endTime: Date;
  instructorName: string;
  locationName: string;
  locationAddress: string | null;
}) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${booking.classTypeName} — Ilannatek`,
    dates: `${fmt(booking.startTime)}/${fmt(booking.endTime)}`,
    details: `Avec ${booking.instructorName}`,
    location: [booking.locationName, booking.locationAddress].filter(Boolean).join(", "),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const now = new Date();
  const checkInWindowOpen = new Date(now.getTime() - 90 * 60000); // -90min
  const checkInWindowClose = new Date(now.getTime() + 30 * 60000); // +30min

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [upcomingBookings, pastBookings, subs, transactions, allConfirmedBookings] = await Promise.all([
    db.booking.findMany({
      where: {
        userId: user.id,
        status: { in: ["CONFIRMED", "WAITLIST"] },
        session: { startTime: { gte: now } },
      },
      include: {
        session: {
          include: {
            classType: true,
            instructor: { select: { firstName: true, lastName: true } },
            location: true,
            checkIns: { where: { userId: user.id }, select: { id: true } },
          },
        },
      },
      orderBy: { session: { startTime: "asc" } },
    }),
    db.booking.findMany({
      where: {
        userId: user.id,
        status: { in: ["ATTENDED", "NO_SHOW", "CANCELLED", "CONFIRMED"] },
        session: { startTime: { lt: now } },
      },
      include: {
        session: {
          include: {
            classType: true,
            instructor: { select: { firstName: true, lastName: true } },
            location: true,
          },
        },
      },
      orderBy: { session: { startTime: "desc" } },
      take: 30,
    }),
    db.subscription.findMany({
      where: { userId: user.id },
      include: { plan: true },
      orderBy: { startDate: "desc" },
      take: 5,
    }),
    db.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    db.booking.findMany({
      where: { userId: user.id, status: "CONFIRMED" },
      include: { session: { select: { startTime: true } } },
      orderBy: { session: { startTime: "desc" } },
    }),
  ]);

  const nextBooking = upcomingBookings[0] ?? null;
  const activeSub = subs.find((s) => s.status === "ACTIVE");

  // Stats
  const coursThisMois = allConfirmedBookings.filter(
    (b) => b.session.startTime >= monthStart && b.session.startTime <= now
  ).length;
  const totalCours = allConfirmedBookings.length;
  const serie = computeStreak(allConfirmedBookings.map((b) => ({ startTime: b.session.startTime })));

  // Freeze state
  const isFrozen = !!(user.creditsFrozenUntil && user.creditsFrozenUntil > now);

  // Check-in window open for a booking?
  const checkInNow = upcomingBookings.find((b) => {
    const st = b.session.startTime;
    return st >= checkInWindowOpen && st <= checkInWindowClose;
  });

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-6 pb-8 border-b border-stone2-200">
        <div>
          <p className="section-title">Mon espace</p>
          <h1 className="font-serif text-4xl md:text-5xl font-medium text-brand-600 mt-1">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-sm text-stone2-500 mt-1">{user.email}</p>
        </div>
        <div className="flex items-start gap-4 flex-wrap">
          {/* Credits block */}
          <div className="bg-brand-600 text-cream-50 px-7 py-5 text-center min-w-[140px]">
            <p className="section-title text-stone2-400 mb-1">Crédits</p>
            <p className="font-serif text-5xl font-medium">{user.creditsBalance}</p>
            <Link
              href="/packs"
              className="block mt-3 text-[10px] uppercase tracking-widest text-stone2-300 hover:text-cream-50 border-t border-brand-700 pt-2"
            >
              + Recharger
            </Link>
          </div>
          <div className="flex flex-col gap-2 pt-1">
            {activeSub && (
              <span className="badge bg-accent-100 text-accent-600 border border-accent-200">
                {activeSub.plan.name} actif
              </span>
            )}
            <Link href="/account/profile" className="btn-secondary text-sm">
              Mon profil
            </Link>
            <Link href="/invite" className="btn-secondary text-sm">
              Inviter un ami
            </Link>
          </div>
        </div>
      </div>

      {/* Welcome banner for new members */}
      {totalCours === 0 && (
        <div className="bg-accent-50 border border-accent-200 px-6 py-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-accent-600 mb-1 font-semibold">
              Bienvenue !
            </p>
            <p className="font-medium text-brand-600">
              Vous avez <strong>{user.creditsBalance} crédit{user.creditsBalance > 1 ? "s" : ""}</strong> — réservez votre premier cours.
            </p>
            <p className="text-sm text-stone2-500 mt-0.5">
              Pas encore réservé de cours. Le planning vous attend.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap shrink-0">
            <Link href="/welcome" className="btn-secondary text-sm">
              Comment ça marche
            </Link>
            <Link href="/schedule" className="btn-primary text-sm">
              Voir le planning →
            </Link>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-stretch divide-x divide-stone2-200 border border-stone2-200 bg-white">
        {[
          { value: coursThisMois, label: "Cours ce mois" },
          { value: totalCours, label: "Total cours" },
          { value: serie, label: "Série" },
        ].map(({ value, label }) => (
          <div key={label} className="flex-1 flex flex-col items-center justify-center py-5 px-4 text-center">
            <span className="font-serif text-4xl font-medium text-brand-600 leading-none">{value}</span>
            <span className="text-[9px] uppercase tracking-[0.2em] text-stone2-400 mt-1.5">{label}</span>
          </div>
        ))}
      </div>

      {/* Check-in alert (Mariana Tek style) */}
      {checkInNow && (
        <div className="bg-brand-600 text-cream-50 px-6 py-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-accent-300 mb-1">
              Enregistrement ouvert
            </p>
            <p className="font-serif text-2xl">
              {checkInNow.session.classType.name}
            </p>
            <p className="text-sm text-stone2-300 mt-0.5">
              {checkInNow.session.startTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              {" "}&mdash;{" "}
              {checkInNow.session.location.name}
            </p>
          </div>
          <Link
            href={`/check-in/${checkInNow.session.id}`}
            className="bg-cream-50 text-brand-600 px-6 py-3 text-[11px] uppercase tracking-[0.2em] font-semibold hover:bg-accent-100 transition-colors"
          >
            S'enregistrer →
          </Link>
        </div>
      )}

      {/* Next class hero */}
      {nextBooking && !checkInNow && (
        <div>
          <p className="section-title mb-3">Prochain cours</p>
          <NextClassHero booking={nextBooking} now={now} />
        </div>
      )}

      {/* Tabs: À venir | Historique | Abonnements | Achats | Pause */}
      <AccountTabs
        isFrozen={isFrozen}
        creditsFrozenUntil={user.creditsFrozenUntil?.toISOString() ?? null}
        upcoming={upcomingBookings.map((b) => ({
          id: b.id,
          sessionId: b.session.id,
          status: b.status,
          waitlistPos: b.waitlistPos,
          classTypeName: b.session.classType.name,
          classTypeColor: b.session.classType.color,
          creditCost: b.session.classType.creditCost,
          startTime: b.session.startTime.toISOString(),
          endTime: b.session.endTime.toISOString(),
          instructorName: `${b.session.instructor.firstName} ${b.session.instructor.lastName}`,
          locationName: b.session.location.name,
          locationAddress: b.session.location.address,
          checkedIn: b.session.checkIns.length > 0,
          sessionNotes: b.session.notes ?? null,
          calLink: googleCalLink({
            classTypeName: b.session.classType.name,
            startTime: b.session.startTime,
            endTime: b.session.endTime,
            instructorName: `${b.session.instructor.firstName} ${b.session.instructor.lastName}`,
            locationName: b.session.location.name,
            locationAddress: b.session.location.address,
          }),
        }))}
        past={pastBookings.map((b) => ({
          id: b.id,
          status: b.status,
          classTypeName: b.session.classType.name,
          classTypeColor: b.session.classType.color,
          startTime: b.session.startTime.toISOString(),
          instructorName: `${b.session.instructor.firstName} ${b.session.instructor.lastName}`,
          locationName: b.session.location.name,
          creditsUsed: b.creditsUsed,
          feeApplied: b.feeApplied,
        }))}
        subs={subs.map((s) => ({
          id: s.id,
          planName: s.plan.name,
          status: s.status,
          startDate: s.startDate.toISOString(),
          endDate: s.endDate.toISOString(),
          frozenAt: s.frozenAt?.toISOString() ?? null,
        }))}
        transactions={transactions.map((t) => ({
          id: t.id,
          type: t.type,
          description: t.description,
          creditsDelta: t.creditsDelta,
          amountCents: t.amountCents,
          createdAt: t.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}

// ─── Next class hero ─────────────────────────────────────────────────────────

function NextClassHero({ booking, now }: {
  booking: Awaited<ReturnType<typeof db.booking.findMany>>[0] & {
    session: {
      id: string;
      classType: { name: string; color: string; durationMin: number };
      instructor: { firstName: string; lastName: string };
      location: { name: string; address: string | null };
      startTime: Date;
      endTime: Date;
      checkIns: { id: string }[];
    };
  };
  now: Date;
}) {
  const start = booking.session.startTime;
  const msUntil = start.getTime() - now.getTime();
  const hoursUntil = Math.floor(msUntil / 3600000);
  const minutesUntil = Math.floor((msUntil % 3600000) / 60000);
  const daysUntil = Math.floor(msUntil / 86400000);

  let countdownLabel = "";
  if (daysUntil >= 1) countdownLabel = `Dans ${daysUntil} jour${daysUntil > 1 ? "s" : ""}`;
  else if (hoursUntil >= 1) countdownLabel = `Dans ${hoursUntil}h${minutesUntil > 0 ? minutesUntil : ""}`;
  else countdownLabel = `Dans ${minutesUntil} min`;

  return (
    <div
      className="relative overflow-hidden bg-white border border-stone2-200 p-6 flex flex-wrap items-center gap-6"
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5"
        style={{ backgroundColor: booking.session.classType.color }}
      />
      <div className="pl-4 flex-1 min-w-[200px]">
        <p className="section-title mb-1">
          {start.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          {" · "}
          {start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <h2 className="font-serif text-3xl font-medium text-brand-600">
          {booking.session.classType.name}
        </h2>
        <p className="text-stone2-500 text-sm mt-1">
          {booking.session.instructor.firstName} {booking.session.instructor.lastName}
          {" · "}
          {booking.session.location.name}
          {" · "}
          {booking.session.classType.durationMin} min
        </p>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <div className="text-right">
          <p className="font-serif text-3xl text-accent-600">{countdownLabel}</p>
          {booking.session.checkIns.length > 0 && (
            <p className="text-xs text-green-700 font-medium mt-0.5">✓ Enregistré·e</p>
          )}
        </div>
        {booking.status === "WAITLIST" && (
          <span className="badge bg-accent-100 text-accent-600">
            Liste d'attente · #{booking.waitlistPos}
          </span>
        )}
      </div>
    </div>
  );
}
