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
        include: { session: { select: { startTime: true } } },
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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
                    Voir toutes mes réservations →
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

      {/* ─── FEATURE GUIDE ──────────────────────────────────────────── */}
      <section className="bg-cream-50 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14">
            <p className="section-title mb-2">Guide complet</p>
            <h2 className="font-serif text-4xl font-medium text-brand-600">Tout ce que vous pouvez faire</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-stone2-200 border border-stone2-200">

            {/* Planning */}
            <Link href="/schedule" className="group bg-white p-7 hover:bg-cream-50 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <p className="text-2xl">📅</p>
                <span className="text-[9px] uppercase tracking-widest text-stone2-400 border border-stone2-200 px-2 py-0.5">Planning</span>
              </div>
              <h3 className="font-medium text-brand-600 mb-2 group-hover:text-accent-600 transition-colors">Planning & Réservation</h3>
              <p className="text-sm text-stone2-500 leading-relaxed mb-4">
                Consultez les cours à venir, filtrez par discipline ou instructeur, réservez en un clic avec vos crédits.
                Annulation gratuite jusqu'à {settings.cancellationCutoffMin / 60}h avant.
              </p>
              <ul className="space-y-1.5 text-xs text-stone2-400">
                <li>· Vue semaine / liste / discipline</li>
                <li>· Réservation instantanée avec confirmation email</li>
                <li>· Annulation libre jusqu'à {settings.cancellationCutoffMin / 60}h avant</li>
                <li>· Inscription en liste d'attente si cours complet</li>
              </ul>
              <p className="text-[11px] uppercase tracking-[0.18em] text-brand-600 mt-5 group-hover:text-accent-600 transition-colors">
                Voir le planning →
              </p>
            </Link>

            {/* Mon compte */}
            <Link href="/account" className="group bg-white p-7 hover:bg-cream-50 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <p className="text-2xl">👤</p>
                <span className="text-[9px] uppercase tracking-widest text-stone2-400 border border-stone2-200 px-2 py-0.5">Compte</span>
              </div>
              <h3 className="font-medium text-brand-600 mb-2 group-hover:text-accent-600 transition-colors">Mon espace membre</h3>
              <p className="text-sm text-stone2-500 leading-relaxed mb-4">
                Tableau de bord personnel : crédits, réservations, historique, statistiques, série de présence, et gestion de l'abonnement.
              </p>
              <ul className="space-y-1.5 text-xs text-stone2-400">
                <li>· Solde de crédits en temps réel</li>
                <li>· Historique complet des réservations</li>
                <li>· Statistiques : séries, cours du mois, total</li>
                <li>· Gestion abonnement (pause, résiliation)</li>
              </ul>
              <p className="text-[11px] uppercase tracking-[0.18em] text-brand-600 mt-5 group-hover:text-accent-600 transition-colors">
                Mon compte →
              </p>
            </Link>

            {/* Crédits & Packs */}
            <Link href="/packs" className="group bg-white p-7 hover:bg-cream-50 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <p className="text-2xl">💳</p>
                <span className="text-[9px] uppercase tracking-widest text-stone2-400 border border-stone2-200 px-2 py-0.5">Paiement</span>
              </div>
              <h3 className="font-medium text-brand-600 mb-2 group-hover:text-accent-600 transition-colors">Crédits & Packs</h3>
              <p className="text-sm text-stone2-500 leading-relaxed mb-4">
                Achetez des crédits à la carte pour réserver vos cours. Paiement sécurisé Stripe.
                Crédits sans date d'expiration.
              </p>
              <ul className="space-y-1.5 text-xs text-stone2-400">
                <li>· Différents packs selon vos besoins</li>
                <li>· Paiement Stripe PCI DSS Level 1</li>
                <li>· Crédits utilisables sur tous les cours</li>
                <li>· Historique des transactions</li>
              </ul>
              <p className="text-[11px] uppercase tracking-[0.18em] text-brand-600 mt-5 group-hover:text-accent-600 transition-colors">
                Acheter des crédits →
              </p>
            </Link>

            {/* Abonnements */}
            <Link href="/subscriptions" className="group bg-white p-7 hover:bg-cream-50 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <p className="text-2xl">🔄</p>
                <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 bg-accent-100 text-accent-600 border border-accent-200">Populaire</span>
              </div>
              <h3 className="font-medium text-brand-600 mb-2 group-hover:text-accent-600 transition-colors">Abonnements mensuels</h3>
              <p className="text-sm text-stone2-500 leading-relaxed mb-4">
                Crédits renouvelés automatiquement chaque mois. La meilleure option pour une pratique régulière.
                Sans engagement, résiliable à tout moment.
              </p>
              <ul className="space-y-1.5 text-xs text-stone2-400">
                <li>· Renouvellement automatique mensuel</li>
                <li>· Meilleur prix au crédit</li>
                <li>· Pause possible (congés, blessure)</li>
                <li>· Résiliation en un clic depuis le compte</li>
              </ul>
              <p className="text-[11px] uppercase tracking-[0.18em] text-brand-600 mt-5 group-hover:text-accent-600 transition-colors">
                Voir les abonnements →
              </p>
            </Link>

            {/* Liste d'attente */}
            <div className="bg-white p-7">
              <div className="flex items-start justify-between mb-4">
                <p className="text-2xl">⏳</p>
                <span className="text-[9px] uppercase tracking-widest text-stone2-400 border border-stone2-200 px-2 py-0.5">Automatique</span>
              </div>
              <h3 className="font-medium text-brand-600 mb-2">Liste d'attente intelligente</h3>
              <p className="text-sm text-stone2-500 leading-relaxed mb-4">
                Cours complet ? Rejoignez la liste d'attente gratuitement. Dès qu'une place se libère,
                vous recevez un email avec 30 minutes pour confirmer votre place.
              </p>
              <ul className="space-y-1.5 text-xs text-stone2-400">
                <li>· Inscription sans engagement (aucun crédit débité)</li>
                <li>· Notification email dès qu'une place se libère</li>
                <li>· 30 minutes pour accepter l'offre</li>
                <li>· Priorité par ordre d'inscription</li>
              </ul>
              <Link href="/schedule" className="text-[11px] uppercase tracking-[0.18em] text-brand-600 mt-5 block hover:text-accent-600 transition-colors">
                Voir les cours →
              </Link>
            </div>

            {/* Check-in QR */}
            <Link href="/account" className="group bg-white p-7 hover:bg-cream-50 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <p className="text-2xl">📱</p>
                <span className="text-[9px] uppercase tracking-widest text-stone2-400 border border-stone2-200 px-2 py-0.5">Check-in</span>
              </div>
              <h3 className="font-medium text-brand-600 mb-2 group-hover:text-accent-600 transition-colors">QR Code Check-in</h3>
              <p className="text-sm text-stone2-500 leading-relaxed mb-4">
                À l'entrée du cours, présentez votre QR code personnel depuis l'application.
                Check-in enregistré en une seconde. Plus de file d'attente.
              </p>
              <ul className="space-y-1.5 text-xs text-stone2-400">
                <li>· QR code unique par membre</li>
                <li>· Check-in 30 min avant et pendant le cours</li>
                <li>· Présence enregistrée dans vos stats</li>
                <li>· Auto-check-in possible depuis l'app</li>
              </ul>
              <p className="text-[11px] uppercase tracking-[0.18em] text-brand-600 mt-5 group-hover:text-accent-600 transition-colors">
                Mon QR code →
              </p>
            </Link>

            {/* Rappels */}
            <div className="bg-white p-7">
              <div className="flex items-start justify-between mb-4">
                <p className="text-2xl">🔔</p>
                <span className="text-[9px] uppercase tracking-widest text-stone2-400 border border-stone2-200 px-2 py-0.5">Email</span>
              </div>
              <h3 className="font-medium text-brand-600 mb-2">Rappels automatiques</h3>
              <p className="text-sm text-stone2-500 leading-relaxed mb-4">
                Vous ne raterez plus jamais un cours. Rappels automatiques envoyés par email
                la veille et 2 heures avant chaque cours réservé.
              </p>
              <ul className="space-y-1.5 text-xs text-stone2-400">
                <li>· Email J-1 avec détails du cours</li>
                <li>· Email 2h avant pour ne rien oublier</li>
                <li>· Email post-cours avec vos stats</li>
                <li>· Récap hebdomadaire chaque dimanche</li>
              </ul>
              <Link href="/account/profile" className="text-[11px] uppercase tracking-[0.18em] text-brand-600 mt-5 block hover:text-accent-600 transition-colors">
                Préférences email →
              </Link>
            </div>

            {/* Mode Duo */}
            <Link href="/invite" className="group bg-white p-7 hover:bg-cream-50 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <p className="text-2xl">👥</p>
                <span className="text-[9px] uppercase tracking-widest text-stone2-400 border border-stone2-200 px-2 py-0.5">Parrainage</span>
              </div>
              <h3 className="font-medium text-brand-600 mb-2 group-hover:text-accent-600 transition-colors">Mode Duo — Inviter un ami</h3>
              <p className="text-sm text-stone2-500 leading-relaxed mb-4">
                Parrainez un proche et gagnez chacun 1 crédit offert dès son inscription.
                Plus vous invitez, plus vous pratiquez.
              </p>
              <ul className="space-y-1.5 text-xs text-stone2-400">
                <li>· 1 crédit offert pour vous</li>
                <li>· 1 crédit offert pour votre filleul</li>
                <li>· Lien d'invitation personnalisé</li>
                <li>· Illimité — invitez autant d'amis que vous voulez</li>
              </ul>
              <p className="text-[11px] uppercase tracking-[0.18em] text-brand-600 mt-5 group-hover:text-accent-600 transition-colors">
                Inviter un ami →
              </p>
            </Link>

            {/* Profil */}
            <Link href="/account/profile" className="group bg-white p-7 hover:bg-cream-50 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <p className="text-2xl">⚙️</p>
                <span className="text-[9px] uppercase tracking-widest text-stone2-400 border border-stone2-200 px-2 py-0.5">Paramètres</span>
              </div>
              <h3 className="font-medium text-brand-600 mb-2 group-hover:text-accent-600 transition-colors">Mon profil & Paramètres</h3>
              <p className="text-sm text-stone2-500 leading-relaxed mb-4">
                Gérez vos informations personnelles, mot de passe, préférences de confidentialité
                et options de communication.
              </p>
              <ul className="space-y-1.5 text-xs text-stone2-400">
                <li>· Modifier nom, email, téléphone</li>
                <li>· Changer le mot de passe</li>
                <li>· Opt-in/out emails marketing (RGPD)</li>
                <li>· Visibilité dans la liste des participants</li>
              </ul>
              <p className="text-[11px] uppercase tracking-[0.18em] text-brand-600 mt-5 group-hover:text-accent-600 transition-colors">
                Mon profil →
              </p>
            </Link>

          </div>
        </div>
      </section>

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

      {/* ─── DISCIPLINES REMINDER ───────────────────────────────────── */}
      <section className="bg-cream-100 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-serif text-2xl text-brand-600 font-medium">Les disciplines du studio</h2>
            <Link href="/classes" className="text-[11px] uppercase tracking-[0.18em] text-stone2-500 hover:text-brand-600 transition-colors border-b border-stone2-300 pb-1">
              Toutes les disciplines →
            </Link>
          </div>
          <Link href="/schedule" className="block border border-stone2-200 bg-white p-6 hover:bg-cream-50 transition-colors text-center">
            <p className="font-serif text-xl text-brand-600 mb-1">Voir le planning complet</p>
            <p className="text-sm text-stone2-400">Trouvez votre prochain cours et réservez en quelques secondes</p>
          </Link>
        </div>
      </section>

      {/* ─── HELP / LINKS ───────────────────────────────────────────── */}
      <section className="bg-cream-50 py-12 px-6 border-t border-stone2-200">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="font-serif text-lg text-brand-600 mb-1">Une question ?</p>
            <p className="text-sm text-stone2-500">
              Consultez le{" "}
              <Link href="/" className="underline hover:text-brand-600">planning</Link>,{" "}
              ou écrivez-nous directement depuis votre espace.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/schedule" className="btn-primary text-sm">Réserver un cours</Link>
            <Link href="/account" className="btn-secondary text-sm">Mon espace</Link>
          </div>
        </div>
      </section>

    </div>
  );
}
