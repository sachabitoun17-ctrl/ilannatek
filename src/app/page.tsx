export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getCachedPlans } from "@/lib/cached";
import { formatPrice } from "@/lib/utils";

const TESTIMONIALS = [
  {
    text: "J'ai essayé beaucoup de studios à Paris. Ilannatek est dans une catégorie à part — l'attention aux détails, la qualité des instructeurs, l'ambiance. On y revient encore et encore.",
    author: "Camille D.",
    since: "Membre depuis 6 mois",
  },
  {
    text: "Le système de réservation est tellement simple. Je réserve depuis le métro, c'est confirmé en deux secondes. Zéro friction, zéro stress.",
    author: "Thomas L.",
    since: "Membre depuis 3 mois",
  },
  {
    text: "Ce qui me plaît vraiment, c'est que les cours sont toujours complets mais jamais surpeuplés. Le format boutique, ça change tout.",
    author: "Sarah M.",
    since: "Membre depuis 1 an",
  },
];

const FAQ = [
  {
    q: "Comment fonctionne le système de crédits ?",
    a: "Chaque cours consomme un nombre défini de crédits selon son type. Vous achetez des crédits à l'avance — ils n'ont pas de date d'expiration. Vous pouvez aussi souscrire un abonnement mensuel pour un forfait de crédits renouvelé automatiquement.",
  },
  {
    q: "Puis-je annuler une réservation ?",
    a: "Oui, jusqu'à 2 heures avant le début du cours. Votre crédit vous est immédiatement recrédité. En cas d'annulation tardive ou d'absence non justifiée, le crédit peut être retenu.",
  },
  {
    q: "Comment fonctionne la liste d'attente ?",
    a: "Si un cours est complet, vous pouvez vous inscrire en liste d'attente. Dès qu'une place se libère, vous êtes automatiquement notifié par email — vous avez 30 minutes pour confirmer votre place.",
  },
  {
    q: "Les abonnements sont-ils sans engagement ?",
    a: "Oui. Vous pouvez résilier à tout moment depuis votre espace compte. La résiliation prend effet à la fin de la période en cours. Vos crédits restants demeurent disponibles.",
  },
  {
    q: "Comment se passe le check-in ?",
    a: "À l'entrée du cours, présentez votre QR code personnel (disponible dans Mon compte). Le check-in est enregistré instantanément. Aucune attente, aucune paperasse.",
  },
];

export default async function Home() {
  const now = new Date();
  const [user, settings, classTypes, instructors, memberCount, sessionCount, upcomingSessions, allPlans] =
    await Promise.all([
      getCurrentUser(),
      getSettings(),
      db.classType.findMany({ where: { active: true }, take: 8, orderBy: { name: "asc" } }),
      db.user.findMany({
        where: { role: "INSTRUCTOR", active: true },
        take: 4,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          instructorBio: true,
          instructorPhoto: true,
        },
      }),
      db.user.count({ where: { role: "USER", active: true } }),
      db.session.count({ where: { status: "COMPLETED" } }),
      db.session.findMany({
        where: { status: "SCHEDULED", startTime: { gt: now } },
        orderBy: { startTime: "asc" },
        take: 4,
        include: {
          classType: true,
          location: true,
          instructor: { select: { firstName: true, lastName: true } },
          _count: { select: { bookings: { where: { status: "CONFIRMED" } } } },
        },
      }),
      getCachedPlans(),
    ]);

  const packs = allPlans.filter((p) => p.type === "CREDIT_PACK" && p.active && !p.introOnly).slice(0, 3);
  const subs = allPlans.filter((p) => p.type === "SUBSCRIPTION" && p.active).slice(0, 3);

  const trustStats = [
    { value: memberCount > 10 ? `${memberCount}+` : "100+", label: "Membres actifs" },
    { value: sessionCount > 10 ? `${sessionCount}+` : "500+", label: "Séances dispensées" },
    { value: classTypes.length > 0 ? `${classTypes.length}` : "6", label: "Disciplines" },
    { value: "2h", label: "Annulation gratuite" },
  ];

  const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

  return (
    <div className="-mx-4 md:-mx-8 -my-10">

      {/* ─── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative bg-brand-600 text-cream-50 overflow-hidden min-h-[92vh] flex flex-col justify-center">
        {/* Subtle grain overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 60% 75% at 5% 10%, rgba(188,148,74,0.18) 0%, transparent 55%), radial-gradient(ellipse 45% 55% at 95% 90%, rgba(160,123,58,0.14) 0%, transparent 50%), radial-gradient(ellipse 30% 40% at 50% 50%, rgba(255,255,255,0.02) 0%, transparent 60%)",
          }}
        />
        {/* Vertical rule */}
        <div className="absolute top-0 left-[42%] bottom-0 w-px bg-cream-50/[0.04] hidden lg:block" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-28 md:py-36 w-full">
          <div className="flex flex-col lg:flex-row lg:items-end gap-16 lg:gap-28">
            {/* Left: main copy */}
            <div className="flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.5em] text-accent-300 mb-8">
                Studio Boutique · Paris
              </p>
              <h1
                className="font-serif font-medium text-cream-50 leading-[0.88] mb-8"
                style={{ fontSize: "clamp(3.8rem, 12vw, 8rem)" }}
              >
                {settings.studioName}
              </h1>
              <p className="text-stone2-300 text-lg md:text-xl leading-relaxed mb-12 max-w-md font-light">
                Des cours de qualité, en petit groupe, avec des instructeurs qui vous connaissent.
                Réservez en 10 secondes.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/schedule"
                  className="inline-flex items-center justify-center px-10 py-4 bg-cream-50 text-brand-600 text-[11px] uppercase tracking-[0.25em] font-semibold hover:bg-accent-200 transition-colors min-h-[54px]"
                >
                  Voir le planning
                </Link>
                {!user ? (
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center px-10 py-4 border border-cream-50/30 text-cream-50 text-[11px] uppercase tracking-[0.25em] font-medium hover:border-cream-50 hover:bg-cream-50/5 transition-colors min-h-[54px]"
                  >
                    Créer mon compte gratuit
                  </Link>
                ) : (
                  <Link
                    href="/account"
                    className="inline-flex items-center justify-center px-10 py-4 border border-cream-50/30 text-cream-50 text-[11px] uppercase tracking-[0.25em] font-medium hover:border-cream-50 hover:bg-cream-50/5 transition-colors min-h-[54px]"
                  >
                    Mon espace →
                  </Link>
                )}
              </div>
            </div>

            {/* Right: next sessions */}
            {upcomingSessions.length > 0 && (
              <div className="lg:max-w-[300px] w-full space-y-3">
                <p className="text-[9px] uppercase tracking-[0.4em] text-stone2-500 mb-4">
                  Prochaines séances
                </p>
                {upcomingSessions.map((s) => {
                  const spotsLeft = s.capacity - s._count.bookings;
                  return (
                    <Link
                      key={s.id}
                      href="/schedule"
                      className="block bg-white/[0.06] border border-white/10 px-4 py-3.5 hover:bg-white/[0.10] hover:border-white/20 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-cream-50 text-sm truncate group-hover:text-accent-200 transition-colors">
                            {s.classType.name}
                          </p>
                          <p className="text-stone2-400 text-xs mt-0.5">
                            {DAYS_FR[s.startTime.getDay()]} {s.startTime.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                            {" · "}
                            {s.startTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span
                            className={`inline-block text-[9px] uppercase tracking-wider px-2 py-0.5 font-medium ${
                              spotsLeft === 0
                                ? "bg-red-900/40 text-red-300"
                                : spotsLeft <= 2
                                ? "bg-accent-500/20 text-accent-300"
                                : "bg-white/10 text-stone2-400"
                            }`}
                          >
                            {spotsLeft === 0 ? "Complet" : `${spotsLeft} pl.`}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
                <Link
                  href="/schedule"
                  className="block text-center text-[10px] uppercase tracking-[0.2em] text-stone2-500 hover:text-accent-300 transition-colors pt-2"
                >
                  Planning complet →
                </Link>
              </div>
            )}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-400/30 to-transparent" />
      </section>

      {/* ─── TRUST BAR ────────────────────────────────────────────────── */}
      <section className="bg-stone2-800">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-stone2-700">
            {trustStats.map((s) => (
              <div key={s.label} className="px-6 py-7 text-center">
                <p className="font-serif text-3xl text-cream-50 font-medium">{s.value}</p>
                <p className="text-[9px] uppercase tracking-widest text-stone2-500 mt-1.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PHILOSOPHY ───────────────────────────────────────────────── */}
      <section className="bg-cream-50 py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-center">
            <div>
              <p className="section-title mb-6">Notre philosophie</p>
              <h2 className="font-serif text-4xl md:text-5xl font-medium text-brand-600 leading-[1.05]">
                Le format boutique,
                <br />
                <span className="italic font-normal">pas le format usine.</span>
              </h2>
            </div>
            <div className="space-y-5">
              <p className="text-stone2-600 leading-relaxed">
                Ilannatek est né d'une conviction simple : les meilleurs cours se donnent en petits
                groupes, avec des instructeurs qui connaissent vos prénoms et votre niveau.
              </p>
              <p className="text-stone2-600 leading-relaxed">
                Pas de grandes salles impersonnelles. Pas de files d&apos;attente.
                Un programme soigné, des professeurs exceptionnels, et une plateforme qui rend la
                réservation aussi simple qu&apos;elle devrait toujours l&apos;être.
              </p>
              <div className="pt-4 border-t border-stone2-100">
                <Link
                  href="/classes"
                  className="text-[11px] uppercase tracking-[0.2em] text-brand-600 border-b border-brand-600/40 pb-1 hover:border-brand-600 transition-colors"
                >
                  Découvrir nos disciplines →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── DISCIPLINES ──────────────────────────────────────────────── */}
      {classTypes.length > 0 && (
        <section className="py-28 px-6 bg-brand-600">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-accent-300 mb-3">
                  Nos pratiques
                </p>
                <h2 className="font-serif text-4xl md:text-5xl font-medium text-cream-50 leading-tight">
                  {classTypes.length} discipline{classTypes.length > 1 ? "s" : ""},
                  <br />
                  <span className="italic font-normal">une exigence.</span>
                </h2>
              </div>
              <Link
                href="/schedule"
                className="inline-flex items-center text-[11px] uppercase tracking-[0.22em] text-cream-50 border-b border-cream-50/40 pb-1 hover:border-cream-50 hover:text-accent-300 transition-colors shrink-0"
              >
                Voir le planning complet
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-brand-700">
              {classTypes.map((ct) => (
                <Link
                  key={ct.id}
                  href="/schedule"
                  className="group bg-brand-600 p-8 hover:bg-brand-700 transition-colors"
                >
                  <div
                    className="h-0.5 w-10 mb-6 transition-all duration-300 group-hover:w-16"
                    style={{ backgroundColor: ct.color }}
                  />
                  <h3 className="font-serif text-xl text-cream-50 mb-2 font-medium">{ct.name}</h3>
                  {ct.description && (
                    <p className="text-stone2-400 text-xs mb-5 leading-relaxed line-clamp-2">
                      {ct.description}
                    </p>
                  )}
                  <p className="text-[10px] uppercase tracking-widest text-stone2-500">
                    {ct.durationMin}&thinsp;min
                    <span className="mx-2 text-stone2-600">·</span>
                    {ct.creditCost} crédit{ct.creditCost > 1 ? "s" : ""}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="bg-cream-50 py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <p className="section-title mb-3">Fonctionnement</p>
            <h2 className="font-serif text-4xl md:text-5xl font-medium text-brand-600 leading-tight">
              Trois étapes, c&apos;est tout.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-0 md:gap-px bg-transparent md:bg-stone2-200 md:border md:border-stone2-200">
            {[
              {
                step: "01",
                title: "Choisir",
                desc: "Consultez le planning en temps réel. Filtrez par discipline, horaire, instructeur ou lieu.",
              },
              {
                step: "02",
                title: "Réserver",
                desc: "Confirmation instantanée par email. Un crédit débité, et c'est validé. Annulation possible jusqu'à 2h avant.",
              },
              {
                step: "03",
                title: "Venir",
                desc: "Présentez votre QR code à l'entrée. Check-in en une seconde. Profitez. Recommencez.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center py-14 px-8 bg-white">
                <p className="font-serif text-6xl text-accent-500/60 mb-5">{item.step}</p>
                <h3 className="font-serif text-2xl text-brand-600 mb-4">{item.title}</h3>
                <p className="text-stone2-500 text-sm leading-relaxed max-w-[240px] mx-auto">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-14">
            <Link href="/schedule" className="btn-primary">
              Voir les cours disponibles
            </Link>
          </div>
        </div>
      </section>

      {/* ─── INSTRUCTORS ──────────────────────────────────────────────── */}
      {instructors.length > 0 && (
        <section className="py-28 px-6 bg-cream-100">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-20">
              <div>
                <p className="section-title mb-3">L&apos;équipe</p>
                <h2 className="font-serif text-4xl md:text-5xl font-medium text-brand-600 leading-tight">
                  Vos instructeurs
                </h2>
              </div>
              <Link
                href="/instructors"
                className="text-[11px] uppercase tracking-[0.2em] text-stone2-500 hover:text-brand-600 transition-colors border-b border-stone2-300 pb-1 shrink-0"
              >
                Voir toute l&apos;équipe →
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10">
              {instructors.map((inst) => (
                <div key={inst.id} className="group">
                  <div className="w-16 h-16 bg-brand-600 text-cream-50 font-serif text-2xl flex items-center justify-center mb-5 select-none group-hover:bg-brand-700 transition-colors">
                    {inst.firstName[0]}{inst.lastName[0]}
                  </div>
                  <h3 className="font-serif text-xl text-brand-600 font-medium">
                    {inst.firstName} {inst.lastName}
                  </h3>
                  {inst.instructorBio && (
                    <p className="text-sm text-stone2-500 mt-2 leading-relaxed line-clamp-3">
                      {inst.instructorBio}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── TESTIMONIALS ─────────────────────────────────────────────── */}
      <section className="py-28 px-6 bg-brand-600">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[10px] uppercase tracking-[0.3em] text-accent-300 mb-3">Témoignages</p>
            <h2 className="font-serif text-4xl md:text-5xl font-medium text-cream-50 leading-tight">
              Ce qu&apos;ils en disent
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-px bg-brand-700">
            {TESTIMONIALS.map((t) => (
              <div key={t.author} className="bg-brand-600 p-8 flex flex-col gap-6">
                <p className="font-serif text-xl text-stone2-200 font-light italic leading-snug flex-1">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="border-t border-brand-700 pt-5">
                  <p className="text-sm text-cream-50 font-medium">{t.author}</p>
                  <p className="text-[10px] uppercase tracking-widest text-stone2-500 mt-0.5">{t.since}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ──────────────────────────────────────────────────── */}
      <section className="py-28 px-6 bg-cream-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="section-title mb-3">Tarifs</p>
            <h2 className="font-serif text-4xl md:text-5xl font-medium text-brand-600 leading-tight">
              Flexible ou régulier —
              <br />
              <span className="italic font-normal">à vous de choisir.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-6">
            {/* Packs */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-stone2-400 mb-5">À la carte · Crédits</p>
              {packs.length > 0 ? (
                <div className="space-y-3">
                  {packs.map((p) => {
                    const pricePerCredit = p.creditsAmount
                      ? formatPrice(Math.round(p.priceCents / p.creditsAmount))
                      : null;
                    return (
                      <div key={p.id} className="bg-white border border-stone2-100 p-5 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-brand-600 text-sm">{p.name}</p>
                          {p.creditsAmount && (
                            <p className="text-xs text-stone2-400 mt-0.5">
                              {p.creditsAmount} crédit{p.creditsAmount > 1 ? "s" : ""}
                              {pricePerCredit && ` · ${pricePerCredit}/crédit`}
                            </p>
                          )}
                        </div>
                        <p className="font-serif text-xl text-brand-600 font-medium shrink-0">
                          {formatPrice(p.priceCents)}
                        </p>
                      </div>
                    );
                  })}
                  <Link
                    href="/packs"
                    className="block text-center text-[11px] uppercase tracking-[0.22em] text-brand-600 border border-brand-600 py-3 hover:bg-brand-600 hover:text-cream-50 transition-colors mt-4"
                  >
                    Voir tous les packs →
                  </Link>
                </div>
              ) : (
                <div className="bg-white border border-stone2-100 p-8 text-center">
                  <p className="text-stone2-500 text-sm mb-4">
                    Achetez des crédits, utilisez-les quand vous voulez. Pas d'expiration.
                  </p>
                  <Link href="/packs" className="text-[11px] uppercase tracking-[0.22em] text-brand-600 border-b border-brand-600/40 pb-1 hover:border-brand-600 transition-colors">
                    Voir les packs →
                  </Link>
                </div>
              )}
            </div>

            {/* Subscriptions */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <p className="text-[10px] uppercase tracking-[0.3em] text-stone2-400">Mensuel · Abonnements</p>
                <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 bg-accent-500 text-brand-600 font-semibold">Populaire</span>
              </div>
              {subs.length > 0 ? (
                <div className="space-y-3">
                  {subs.map((s) => (
                    <div key={s.id} className="bg-brand-600 border border-brand-700 p-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-cream-50 text-sm">{s.name}</p>
                        {s.creditsPerCycle && (
                          <p className="text-xs text-stone2-400 mt-0.5">
                            {s.creditsPerCycle} crédits / mois · renouvellement auto
                          </p>
                        )}
                      </div>
                      <p className="font-serif text-xl text-accent-300 font-medium shrink-0">
                        {formatPrice(s.priceCents)}<span className="text-stone2-500 text-xs font-sans font-normal">/mois</span>
                      </p>
                    </div>
                  ))}
                  <Link
                    href="/subscriptions"
                    className="block text-center text-[11px] uppercase tracking-[0.22em] text-brand-600 bg-cream-50 border border-stone2-200 py-3 hover:bg-stone2-100 transition-colors mt-4"
                  >
                    Voir les abonnements →
                  </Link>
                </div>
              ) : (
                <div className="bg-brand-600 border border-brand-700 p-8 text-center">
                  <p className="text-stone2-300 text-sm mb-4">
                    Crédits renouvelés automatiquement chaque mois. La meilleure option pour les habitué·e·s.
                  </p>
                  <Link href="/subscriptions" className="text-[11px] uppercase tracking-[0.22em] text-accent-300 border-b border-accent-300/40 pb-1 hover:border-accent-300 transition-colors">
                    Voir les abonnements →
                  </Link>
                </div>
              )}
            </div>
          </div>

          <p className="text-center text-[10px] uppercase tracking-widest text-stone2-400">
            Paiement sécurisé · Stripe PCI DSS Level 1 · Annulation en un clic
          </p>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-28 px-6 bg-cream-100">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <p className="section-title mb-3">Questions fréquentes</p>
            <h2 className="font-serif text-4xl font-medium text-brand-600">FAQ</h2>
          </div>
          <div className="divide-y divide-stone2-200">
            {FAQ.map((item) => (
              <div key={item.q} className="py-7">
                <h3 className="font-serif text-xl text-brand-600 font-medium mb-3">{item.q}</h3>
                <p className="text-sm text-stone2-600 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ────────────────────────────────────────────────── */}
      {!user && (
        <section className="py-32 px-6 bg-brand-600 text-center relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 50% 60% at 20% 50%, rgba(188,148,74,0.12) 0%, transparent 60%), radial-gradient(ellipse 40% 50% at 80% 50%, rgba(160,123,58,0.10) 0%, transparent 55%)",
            }}
          />
          <div className="relative z-10">
            <p className="text-[10px] uppercase tracking-[0.4em] text-accent-300 mb-7">Rejoignez-nous</p>
            <h2
              className="font-serif font-medium text-cream-50 mb-5 leading-[0.95]"
              style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)" }}
            >
              Prêt·e à commencer ?
            </h2>
            <p className="text-stone2-400 mb-12 max-w-sm mx-auto leading-relaxed">
              Créez votre compte en 30 secondes.
              {settings.welcomeCredits > 0 && (
                <> <span className="text-accent-300 font-medium">{settings.welcomeCredits} crédit{settings.welcomeCredits > 1 ? "s" : ""} offert{settings.welcomeCredits > 1 ? "s" : ""}</span> à l&apos;inscription.</>
              )}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-10 py-4 bg-cream-50 text-brand-600 text-[11px] uppercase tracking-[0.25em] font-semibold hover:bg-accent-200 transition-colors min-h-[54px]"
              >
                Créer mon compte
              </Link>
              <Link
                href="/schedule"
                className="inline-flex items-center justify-center px-10 py-4 border border-cream-50/40 text-cream-50 text-[11px] uppercase tracking-[0.25em] font-medium hover:border-cream-50 hover:bg-cream-50/5 transition-colors min-h-[54px]"
              >
                Voir le planning
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
