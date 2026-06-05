export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

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
    a: "Si un cours est complet, vous pouvez vous inscrire en liste d'attente. Dès qu'une place se libère, vous êtes automatiquement notifié par email. Aucun crédit n'est débité à ce stade.",
  },
  {
    q: "Les abonnements sont-ils sans engagement ?",
    a: "Oui. Vous pouvez résilier à tout moment depuis votre espace compte. La résiliation prend effet à la fin de la période en cours. Vos crédits restants demeurent disponibles.",
  },
];

export default async function Home() {
  const [user, settings, classTypes, instructors, memberCount, sessionCount] =
    await Promise.all([
      getCurrentUser(),
      getSettings(),
      db.classType.findMany({ where: { active: true }, take: 6 }),
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
    ]);

  const trustStats = [
    {
      value: memberCount > 10 ? `${memberCount}+` : "100+",
      label: "Membres actifs",
    },
    {
      value: sessionCount > 10 ? `${sessionCount}+` : "500+",
      label: "Séances dispensées",
    },
    {
      value: classTypes.length > 0 ? `${classTypes.length}` : "6",
      label: "Disciplines",
    },
    { value: "2h", label: "Annulation gratuite" },
  ];

  return (
    <div className="-mx-4 md:-mx-8 -my-10">

      {/* ─── HERO ─────────────────────────────────────────────────── */}
      <section className="relative bg-brand-600 text-cream-50 overflow-hidden min-h-[88vh] flex flex-col justify-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 55% 70% at 8% 12%, rgba(188,148,74,0.16) 0%, transparent 55%), radial-gradient(ellipse 40% 50% at 92% 88%, rgba(160,123,58,0.12) 0%, transparent 50%)",
          }}
        />
        <div className="absolute top-0 left-[42%] bottom-0 w-px bg-cream-50/[0.04] hidden md:block" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 py-24 md:py-32">
          <div className="flex flex-col md:flex-row md:items-end gap-12 md:gap-24">
            <div className="flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.45em] text-accent-300 mb-8">
                Studio Boutique · Paris
              </p>
              <h1
                className="font-serif font-medium text-cream-50 leading-[0.88] mb-10"
                style={{ fontSize: "clamp(3.5rem, 11vw, 7.5rem)" }}
              >
                {settings.studioName}
              </h1>
              <div className="flex flex-col sm:flex-row gap-3 mt-12">
                <Link
                  href="/schedule"
                  className="inline-flex items-center justify-center px-9 py-4 bg-cream-50 text-brand-600 text-[11px] uppercase tracking-[0.22em] font-semibold hover:bg-accent-200 transition-colors min-h-[52px]"
                >
                  Voir le planning
                </Link>
                {!user ? (
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center px-9 py-4 border border-cream-50/30 text-cream-50 text-[11px] uppercase tracking-[0.22em] font-medium hover:border-cream-50 hover:bg-cream-50/5 transition-colors min-h-[52px]"
                  >
                    Créer mon compte
                  </Link>
                ) : (
                  <Link
                    href="/account"
                    className="inline-flex items-center justify-center px-9 py-4 border border-cream-50/30 text-cream-50 text-[11px] uppercase tracking-[0.22em] font-medium hover:border-cream-50 hover:bg-cream-50/5 transition-colors min-h-[52px]"
                  >
                    Mon espace
                  </Link>
                )}
              </div>
            </div>

            <div className="md:max-w-[280px] space-y-5">
              <p className="font-serif text-2xl text-stone2-300 font-light leading-snug italic">
                &ldquo;Un lieu pour pratiquer. Un outil pour s&apos;organiser.&rdquo;
              </p>
              <div className="w-8 h-px bg-accent-400/60" />
              <p className="text-stone2-500 text-xs uppercase tracking-widest leading-relaxed">
                Réservez en quelques secondes.<br />Annulez jusqu&apos;à 2h avant.
              </p>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-400/30 to-transparent" />
      </section>

      {/* ─── TRUST BAR ────────────────────────────────────────────── */}
      <section className="bg-stone2-800">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-stone2-700">
            {trustStats.map((s) => (
              <div key={s.label} className="px-6 py-6 text-center">
                <p className="font-serif text-3xl text-cream-50 font-medium">{s.value}</p>
                <p className="text-[9px] uppercase tracking-widest text-stone2-500 mt-1.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PHILOSOPHY ───────────────────────────────────────────── */}
      <section className="bg-cream-50 py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-start">
            <div>
              <p className="section-title mb-6">Notre philosophie</p>
              <h2 className="font-serif text-4xl md:text-5xl font-medium text-brand-600 leading-[1.05]">
                Le format boutique,
                <br />
                <span className="italic font-normal">pas le format usine.</span>
              </h2>
            </div>
            <div className="space-y-5 pt-2">
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
                  Découvrir nos disciplines
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CLASS TYPES ──────────────────────────────────────────── */}
      {classTypes.length > 0 && (
        <section className="py-28 px-6 bg-brand-600">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-accent-300 mb-3">
                  Nos pratiques
                </p>
                <h2 className="font-serif text-4xl md:text-5xl font-medium text-cream-50 leading-tight">
                  {classTypes.length} disciplines,
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
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-px bg-brand-700">
              {classTypes.map((ct) => (
                <Link
                  key={ct.id}
                  href="/schedule"
                  className="group bg-brand-600 p-8 hover:bg-brand-700 transition-colors"
                >
                  <div
                    className="h-0.5 w-10 mb-6 transition-all group-hover:w-16"
                    style={{ backgroundColor: ct.color }}
                  />
                  <h3 className="font-serif text-2xl text-cream-50 mb-3 font-medium">{ct.name}</h3>
                  {ct.description && (
                    <p className="text-stone2-400 text-sm mb-5 leading-relaxed line-clamp-2">
                      {ct.description}
                    </p>
                  )}
                  <p className="text-[10px] uppercase tracking-widest text-stone2-500">
                    {ct.durationMin} min
                    <span className="mx-2 text-stone2-600">·</span>
                    {ct.creditCost} crédit{ct.creditCost > 1 ? "s" : ""}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── HOW IT WORKS ─────────────────────────────────────────── */}
      <section className="bg-cream-50 py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <p className="section-title mb-3">Fonctionnement</p>
            <h2 className="font-serif text-4xl md:text-5xl font-medium text-brand-600 leading-tight">
              Trois étapes, c&apos;est tout.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-0 md:gap-px bg-transparent md:bg-stone2-200 border-0 md:border md:border-stone2-200">
            {[
              {
                step: "01",
                title: "Choisir",
                desc: "Consultez le planning, filtrez par horaire ou par instructeur — trouvez votre cours en un coup d'œil.",
              },
              {
                step: "02",
                title: "Réserver",
                desc: "Un crédit débité, une confirmation instantanée par email. Votre place est garantie.",
              },
              {
                step: "03",
                title: "Venir",
                desc: "Check-in à l'entrée du studio. Profitez pleinement. Recommencez quand vous voulez.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-cream-50 px-8 md:px-10 py-12 md:py-14 text-center border-b border-stone2-200 md:border-0 last:border-0"
              >
                <span className="font-serif text-[4.5rem] leading-none text-accent-400/50 block mb-5">
                  {item.step}
                </span>
                <h3 className="font-serif text-3xl text-brand-600 mb-4 font-medium">
                  {item.title}
                </h3>
                <p className="text-stone2-500 text-sm leading-relaxed max-w-[240px] mx-auto">
                  {item.desc}
                </p>
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

      {/* ─── INSTRUCTORS ──────────────────────────────────────────── */}
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
                Voir toute l&apos;équipe
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10">
              {instructors.map((inst) => (
                <div key={inst.id}>
                  <div className="w-14 h-14 bg-brand-600 text-cream-50 font-serif text-xl flex items-center justify-center mb-5 select-none">
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

      {/* ─── TESTIMONIALS ─────────────────────────────────────────── */}
      <section className="py-28 px-6 bg-brand-600">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[10px] uppercase tracking-[0.3em] text-accent-300 mb-3">
              Témoignages
            </p>
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
                  <p className="text-[10px] uppercase tracking-widest text-stone2-500 mt-0.5">
                    {t.since}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING TEASER ───────────────────────────────────────── */}
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
          <div className="grid sm:grid-cols-2 gap-px bg-stone2-200 border border-stone2-200 mb-8">
            <div className="bg-white p-10">
              <p className="text-[10px] uppercase tracking-[0.28em] text-stone2-400 mb-4">
                À la carte
              </p>
              <h3 className="font-serif text-4xl text-brand-600 font-medium mb-4">Crédits</h3>
              <p className="text-stone2-500 text-sm leading-relaxed mb-8">
                Achetez des crédits, utilisez-les quand vous voulez.
                Parfait pour une pratique libre et sans engagement.
              </p>
              <Link href="/packs" className="btn-primary">
                Voir les packs
              </Link>
            </div>
            <div className="bg-white p-10 relative">
              <span className="absolute top-5 right-5 badge bg-accent-400 text-brand-600 font-semibold">
                Populaire
              </span>
              <p className="text-[10px] uppercase tracking-[0.28em] text-stone2-400 mb-4">
                Récurrent
              </p>
              <h3 className="font-serif text-4xl text-brand-600 font-medium mb-4">Abonnement</h3>
              <p className="text-stone2-500 text-sm leading-relaxed mb-8">
                Mensuel. Crédits renouvelés automatiquement, sans engagement.
                La meilleure option pour les habitué·e·s.
              </p>
              <Link href="/subscriptions" className="btn-primary">
                Voir les abonnements
              </Link>
            </div>
          </div>
          <p className="text-center text-[10px] uppercase tracking-widest text-stone2-400">
            Paiement sécurisé · Stripe PCI DSS Level 1 · Annulation en un clic
          </p>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────────────── */}
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

      {/* ─── FINAL CTA ────────────────────────────────────────────── */}
      {!user && (
        <section className="py-28 px-6 bg-brand-600 text-center">
          <p className="text-[10px] uppercase tracking-[0.35em] text-accent-300 mb-6">
            Rejoignez-nous
          </p>
          <h2
            className="font-serif font-medium text-cream-50 mb-6 leading-[0.95]"
            style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
          >
            Prêt·e à commencer ?
          </h2>
          <p className="text-stone2-300 mb-12 max-w-sm mx-auto text-sm leading-relaxed">
            Créez votre compte en 30 secondes.
            Votre premier cours n&apos;attend plus que vous.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-9 py-4 bg-cream-50 text-brand-600 text-[11px] uppercase tracking-[0.22em] font-semibold hover:bg-accent-200 transition-colors min-h-[52px]"
            >
              Créer mon compte
            </Link>
            <Link
              href="/schedule"
              className="inline-flex items-center justify-center px-9 py-4 border border-cream-50/40 text-cream-50 text-[11px] uppercase tracking-[0.22em] font-medium hover:border-cream-50 hover:bg-cream-50/5 transition-colors min-h-[52px]"
            >
              Voir le planning
            </Link>
          </div>
        </section>
      )}

    </div>
  );
}
