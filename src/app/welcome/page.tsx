export const dynamic = "force-dynamic";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

function computeStreak(bookings: { startTime: Date }[]): number {
  const dates = [...new Set(bookings.map((b) => b.startTime.toDateString()))].sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < dates.length; i++) {
    const diff = Math.floor((today.getTime() - new Date(dates[i]).getTime()) / 86_400_000);
    if (diff <= (i + 1) * 7) streak++;
    else break;
  }
  return streak;
}

export default async function WelcomePage() {
  const user = await requireUser();
  const now = new Date();

  const [settings, nextSession, recentBookings, upcomingBookings, activeSub, totalAttended, checkInToken] =
    await Promise.all([
      getSettings(),
      db.session.findFirst({
        where: { startTime: { gt: now }, status: "SCHEDULED" },
        orderBy: { startTime: "asc" },
        include: { classType: true, location: true, instructor: { select: { firstName: true, lastName: true } } },
      }),
      db.booking.findMany({
        where: {
          userId: user.id,
          status: { in: ["CONFIRMED", "ATTENDED"] },
          session: { startTime: { lte: now } },
        },
        include: {
          session: {
            select: {
              startTime: true,
              classType: { select: { name: true } },
              location: { select: { name: true } },
            },
          },
        },
        orderBy: { session: { startTime: "desc" } },
        take: 50,
      }),
      db.booking.findMany({
        where: {
          userId: user.id,
          status: "CONFIRMED",
          session: { startTime: { gt: now }, status: "SCHEDULED" },
        },
        include: {
          session: { include: { classType: true, location: true } },
        },
        orderBy: { session: { startTime: "asc" } },
        take: 3,
      }),
      db.subscription.findFirst({
        where: { userId: user.id, status: "ACTIVE", endDate: { gt: now } },
        include: { plan: { select: { name: true, creditsPerCycle: true } } },
        orderBy: { endDate: "desc" },
      }),
      db.booking.count({ where: { userId: user.id, status: "ATTENDED" } }),
      db.booking.findFirst({
        where: {
          userId: user.id,
          status: "CONFIRMED",
          session: {
            startTime: { gte: new Date(now.getTime() - 30 * 60000), lte: new Date(now.getTime() + 90 * 60000) },
            status: "SCHEDULED",
          },
        },
        select: { id: true, sessionId: true },
      }),
    ]);

  const streak = computeStreak(recentBookings.map((b) => ({ startTime: b.session.startTime })));
  const isAdmin = user.role === "ADMIN";
  const isInstructor = user.role === "INSTRUCTOR" || user.role === "ADMIN";
  const checkInOpen = !!checkInToken;

  // Last 5 attended sessions for the history panel
  const lastSessions = recentBookings
    .filter((b) => b.status === "ATTENDED" || b.session.startTime < now)
    .slice(0, 5);

  const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

  return (
    <div className="-mx-4 md:-mx-8 -my-10">

      {/* ─── HERO ────────────────────────────────────────────────────── */}
      <section className="bg-brand-600 text-cream-50 px-6 pt-20 pb-14 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 50%, #A07B3A 0%, transparent 55%), radial-gradient(circle at 85% 20%, #BC944A 0%, transparent 45%)",
          }}
        />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-start gap-10">
            {/* Left: welcome + stats */}
            <div className="flex-1">
              <p className="text-accent-300 text-[10px] font-semibold uppercase tracking-[0.4em] mb-4">
                {settings.studioName}
              </p>
              <h1 className="font-serif text-5xl md:text-6xl font-medium mb-4 text-cream-50 leading-[0.95]">
                Bonjour,{" "}
                <span className="text-accent-300 italic font-normal">{user.firstName}</span>
              </h1>
              <p className="text-stone2-400 text-sm mb-8">
                {user.role === "ADMIN" ? "Administrateur" : user.role === "INSTRUCTOR" ? "Instructeur" : "Membre"} · {user.email}
              </p>

              {/* Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {[
                  {
                    value: user.creditsBalance,
                    label: "Crédits",
                    sub: "disponibles",
                    href: "/packs",
                    urgent: user.creditsBalance <= 1,
                  },
                  {
                    value: totalAttended,
                    label: "Cours",
                    sub: "suivis",
                    href: "/account",
                  },
                  {
                    value: streak,
                    label: "Semaines",
                    sub: "de suite",
                    href: "/account",
                  },
                  {
                    value: upcomingBookings.length,
                    label: "Prochains",
                    sub: "cours réservés",
                    href: "/account",
                  },
                ].map((stat) => (
                  <Link
                    key={stat.label}
                    href={stat.href}
                    className={`group p-4 border transition-colors ${
                      stat.urgent
                        ? "border-accent-400/40 bg-accent-900/20 hover:bg-accent-900/30"
                        : "border-white/10 bg-white/[0.06] hover:bg-white/[0.10]"
                    }`}
                  >
                    <p className={`font-serif text-3xl font-medium ${stat.urgent ? "text-accent-300" : "text-cream-50"}`}>
                      {stat.value}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-stone2-400 mt-1">
                      {stat.label}
                      <br />
                      <span className="text-stone2-600">{stat.sub}</span>
                    </p>
                  </Link>
                ))}
              </div>

              {/* Active subscription badge */}
              {activeSub && (
                <div className="inline-flex items-center gap-3 bg-green-900/20 border border-green-500/20 px-4 py-2.5 mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                  <span className="text-xs text-green-300">
                    Abonnement <strong>{activeSub.plan.name}</strong> actif
                    {activeSub.plan.creditsPerCycle && ` · ${activeSub.plan.creditsPerCycle} crédits/mois`}
                  </span>
                </div>
              )}

              {/* Check-in CTA if window open */}
              {checkInOpen && checkInToken && (
                <div className="mt-4 p-4 bg-accent-500/20 border border-accent-400/30">
                  <p className="text-accent-200 text-sm font-medium mb-2">Cours en cours — check-in disponible</p>
                  <Link
                    href={`/check-in/${checkInToken.sessionId}`}
                    className="inline-flex items-center px-5 py-2.5 bg-accent-500 text-brand-600 text-[11px] uppercase tracking-[0.18em] font-semibold hover:bg-accent-400 transition-colors"
                  >
                    Check-in maintenant →
                  </Link>
                </div>
              )}
            </div>

            {/* Right: next bookings */}
            <div className="lg:w-72 shrink-0 space-y-3">
              <p className="text-[9px] uppercase tracking-[0.35em] text-stone2-500 mb-4">Mes prochains cours</p>
              {upcomingBookings.length > 0 ? (
                <>
                  {upcomingBookings.map((b) => (
                    <div key={b.id} className="bg-white/[0.06] border border-white/10 px-4 py-3">
                      <p className="font-medium text-cream-50 text-sm">{b.session.classType.name}</p>
                      <p className="text-stone2-400 text-xs mt-0.5">
                        {DAYS_FR[b.session.startTime.getDay()]}{" "}
                        {b.session.startTime.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        {" · "}
                        {b.session.startTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}
                        {b.session.location && ` · ${b.session.location.name}`}
                      </p>
                    </div>
                  ))}
                  <Link href="/account" className="block text-center text-[10px] uppercase tracking-[0.2em] text-stone2-500 hover:text-accent-300 transition-colors pt-1">
                    Toutes mes réservations →
                  </Link>
                </>
              ) : nextSession ? (
                <div className="space-y-3">
                  <p className="text-stone2-500 text-xs mb-3">Aucun cours réservé</p>
                  <div className="bg-white/[0.06] border border-white/10 px-4 py-3">
                    <p className="text-[9px] uppercase tracking-wider text-accent-300 mb-1">Prochain cours disponible</p>
                    <p className="font-medium text-cream-50 text-sm">{nextSession.classType.name}</p>
                    <p className="text-stone2-400 text-xs mt-0.5">
                      {nextSession.startTime.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                      {" · "}
                      {nextSession.startTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}
                    </p>
                  </div>
                  <Link
                    href="/schedule"
                    className="block text-center px-4 py-3 bg-cream-50 text-brand-600 text-[11px] uppercase tracking-[0.18em] font-medium hover:bg-accent-200 transition-colors"
                  >
                    Réserver →
                  </Link>
                </div>
              ) : (
                <p className="text-stone2-500 text-sm">Aucune séance planifiée pour l'instant.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── QUICK ACTIONS ──────────────────────────────────────────── */}
      <section className="bg-stone2-800 px-6 py-5">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-3">
          {[
            { label: "Planning", href: "/schedule", primary: true },
            { label: "Mon compte", href: "/account" },
            { label: "Acheter des crédits", href: "/packs" },
            { label: "Abonnements", href: "/subscriptions" },
            { label: "Inviter un ami", href: "/invite" },
            { label: "QR Check-in", href: "/account#qr" },
            ...(isAdmin ? [{ label: "Administration", href: "/admin" }] : []),
            ...(isInstructor ? [{ label: "Espace instructeur", href: "/instructor" }] : []),
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className={`inline-flex items-center px-5 py-2.5 text-[11px] uppercase tracking-[0.18em] font-medium transition-colors ${
                a.primary
                  ? "bg-accent-500 text-brand-600 hover:bg-accent-400"
                  : "border border-stone2-600 text-stone2-300 hover:border-stone2-400 hover:text-cream-50"
              }`}
            >
              {a.label}
            </Link>
          ))}
        </div>
      </section>

      {/* ─── RECENT SESSIONS ─────────────────────────────────────────── */}
      {lastSessions.length > 0 && (
        <section className="bg-white py-14 px-6 border-b border-stone2-100">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-serif text-2xl text-brand-600 font-medium">Dernières séances</h2>
              <Link
                href="/account"
                className="text-[11px] uppercase tracking-[0.18em] text-stone2-400 hover:text-brand-600 transition-colors border-b border-stone2-200 pb-px"
              >
                Historique complet →
              </Link>
            </div>
            <div className="divide-y divide-stone2-100">
              {lastSessions.map((b) => (
                <div key={b.id} className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-brand-600 text-sm">
                      {b.session.classType?.name ?? "Cours"}
                    </p>
                    <p className="text-stone2-400 text-xs mt-0.5">
                      {b.session.startTime.toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                      {b.session.location && ` · ${b.session.location.name}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-[9px] uppercase tracking-widest text-stone2-400">
                    {b.status === "ATTENDED" ? "Présent" : "Passé"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── INSTRUCTOR SECTION (role-gated) ────────────────────────── */}
      {isInstructor && (
        <section className="bg-brand-600 py-16 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-10">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-accent-300 mb-2">Espace</p>
                <h2 className="font-serif text-3xl text-cream-50 font-medium">Instructeur</h2>
              </div>
              <Link href="/instructor" className="text-[11px] uppercase tracking-[0.18em] text-accent-300 border-b border-accent-300/40 pb-1 hover:border-accent-300">
                Tableau de bord →
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-px bg-brand-700">
              {[
                {
                  title: "Mes séances",
                  desc: "Consultez vos prochaines séances, la liste des inscrits, et gérez les présences.",
                  href: "/instructor",
                },
                {
                  title: "Marquer les présences",
                  desc: "Confirmez les présents, signalez les absents, déclenchez les frais d'absence si applicable.",
                  href: "/instructor",
                },
                {
                  title: "Demander un remplacement",
                  desc: "Vous ne pouvez pas assurer une séance ? Créez une demande de remplacement pour qu'un collègue reprenne.",
                  href: "/instructor",
                },
              ].map((item) => (
                <Link key={item.title} href={item.href} className="group bg-brand-600 p-7 hover:bg-brand-700 transition-colors">
                  <h3 className="font-medium text-cream-50 mb-2 group-hover:text-accent-200 transition-colors">{item.title}</h3>
                  <p className="text-sm text-stone2-400 leading-relaxed">{item.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── ADMIN SECTION (role-gated) ─────────────────────────────── */}
      {isAdmin && (
        <section className="bg-stone2-800 py-16 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-10">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-stone2-400 mb-2">Espace</p>
                <h2 className="font-serif text-3xl text-cream-50 font-medium">Administration</h2>
              </div>
              <Link href="/admin" className="text-[11px] uppercase tracking-[0.18em] text-stone2-300 border-b border-stone2-500 pb-1 hover:border-stone2-300 hover:text-cream-50">
                Dashboard admin →
              </Link>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-stone2-700">
              {[
                { title: "Membres", desc: "Gérer les comptes, crédits, rôles, bannissements.", href: "/admin/users" },
                { title: "Séances", desc: "Créer, modifier, annuler les cours. Gérer le planning.", href: "/admin/sessions" },
                { title: "Offres & Plans", desc: "Packs de crédits, abonnements, codes promo.", href: "/admin/plans" },
                { title: "Emails", desc: "Broadcast, templates, suivi des envois.", href: "/admin/emails" },
              ].map((item) => (
                <Link key={item.title} href={item.href} className="group bg-stone2-800 p-6 hover:bg-stone2-700 transition-colors">
                  <h3 className="font-medium text-cream-50 mb-2 group-hover:text-accent-200 transition-colors text-sm">{item.title}</h3>
                  <p className="text-xs text-stone2-500 leading-relaxed">{item.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
