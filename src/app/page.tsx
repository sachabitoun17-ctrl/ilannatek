export const dynamic = "force-dynamic";
import type { CSSProperties } from "react";
import Link from "next/link";
import { db } from "@/lib/db";

const FEATURES = [
  {
    title: "Planning en temps réel",
    desc: "Créez des cours récurrents, gérez plusieurs salles et instructeurs. Le planning se publie en un clic, les membres voient les disponibilités à la seconde.",
    tag: "Planning",
  },
  {
    title: "Réservation en 10 secondes",
    desc: "Interface mobile-first pensée pour la rapidité. Un crédit débité, une confirmation email immédiate. Annulation libre jusqu'à 2h avant.",
    tag: "Réservation",
  },
  {
    title: "Packs & abonnements Stripe",
    desc: "Crédits à l'achat ou abonnements mensuels en renouvellement automatique. Liste d'attente gérée automatiquement dès qu'une place se libère.",
    tag: "Paiements",
  },
  {
    title: "Emails automatiques",
    desc: "Rappels de cours, confirmations de réservation, notifications de liste d'attente. Broadcast manuel quand vous avez quelque chose à dire.",
    tag: "Emails",
  },
  {
    title: "Dashboard admin complet",
    desc: "Taux de remplissage, revenus par période, suivi des membres actifs, export CSV. Les données qui comptent, au bon endroit.",
    tag: "Analytics",
  },
  {
    title: "QR Code & check-in instantané",
    desc: "Chaque membre a son QR personnel. Check-in en un scan à l'entrée du cours. Les présences sont enregistrées automatiquement.",
    tag: "Check-in",
  },
];

const PLANS = [
  {
    name: "Starter",
    desc: "Pour lancer votre studio",
    price: "Gratuit",
    priceDetail: "pour toujours",
    features: [
      "Jusqu'à 50 membres actifs",
      "1 studio",
      "Planning & réservation",
      "Packs de crédits",
      "Support email",
    ],
    cta: "Créer mon studio",
    ctaHref: "/register",
    highlight: false,
  },
  {
    name: "Pro",
    desc: "Pour les studios en croissance",
    price: "49€",
    priceDetail: "/ mois",
    features: [
      "Membres illimités",
      "Jusqu'à 3 studios",
      "Abonnements Stripe auto",
      "Emails automatiques",
      "Analytics avancés",
      "Support prioritaire",
    ],
    cta: "Démarrer l'essai gratuit",
    ctaHref: "/register?plan=pro",
    highlight: true,
  },
  {
    name: "Scale",
    desc: "Pour les chaînes de studios",
    price: "99€",
    priceDetail: "/ mois",
    features: [
      "Studios illimités",
      "Widget embarquable",
      "Domaine personnalisé",
      "Onboarding dédié",
      "SLA garanti",
    ],
    cta: "Nous contacter",
    ctaHref: "mailto:contact@ilannatek.fr",
    highlight: false,
  },
];

export default async function PlatformLanding() {
  const [studioCount, totalBookings] = await Promise.all([
    db.studio.count({ where: { status: "ACTIVE" } }).catch(() => 0),
    db.booking.count({ where: { status: { in: ["CONFIRMED", "ATTENDED"] } } }).catch(() => 0),
  ]);

  const displayStudios = studioCount > 1 ? `${studioCount}` : "Plusieurs";
  const displayBookings = totalBookings > 100 ? `${Math.floor(totalBookings / 100) * 100}+` : "Des centaines";

  return (
    <div className="-mx-4 md:-mx-8 -my-10">

      {/* ─── HERO ─────────────────────────────────────────────────────── */}
      <section className="bg-white pt-20 pb-0 px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto">
          {/* Proof line */}
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-stone2-400 mb-12">
            {displayStudios} studios font confiance à la plateforme
          </p>

          {/* Display headline */}
          <div className="mb-10">
            <h1
              className="font-serif font-medium text-brand-600 leading-[0.9]"
              style={{ fontSize: "clamp(3.2rem, 9vw, 7.5rem)", letterSpacing: "-0.025em" }}
            >
              Gérez votre studio.
              <br />
              <span
                className="text-accent-500 italic font-normal"
                style={{ letterSpacing: "-0.02em" }}
              >
                Fidélisez vos membres.
              </span>
            </h1>
          </div>

          {/* Subtitle */}
          <p
            className="text-stone2-500 text-xl leading-relaxed mb-12 max-w-[52ch]"
            style={{ textWrap: "pretty" } as CSSProperties}
          >
            Planning, réservations, packs de crédits, abonnements Stripe, emails automatiques, QR check-in.
            Tout ce qu&apos;il faut pour gérer un studio boutique — en un seul endroit.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 mb-20">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-10 py-4 bg-accent-500 text-white text-[11px] uppercase tracking-[0.22em] font-semibold hover:bg-accent-600 active:scale-[0.98] transition-all min-h-[54px]"
            >
              Créer mon studio — gratuit
            </Link>
            <Link
              href="/studio/ilannatek-paris"
              className="inline-flex items-center justify-center px-10 py-4 border border-stone2-200 text-brand-600 text-[11px] uppercase tracking-[0.22em] font-medium hover:border-brand-600 transition-colors min-h-[54px]"
            >
              Voir un exemple →
            </Link>
          </div>
        </div>

        {/* Bottom stripe — visual break */}
        <div className="h-2 bg-accent-500 max-w-5xl mx-auto" />
      </section>

      {/* ─── STATS BAR ────────────────────────────────────────────────── */}
      <section className="bg-brand-600 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-brand-700">
            {[
              { value: displayStudios, label: "Studios actifs" },
              { value: displayBookings, label: "Réservations gérées" },
              { value: "10 sec", label: "Pour réserver" },
              { value: "Stripe", label: "Paiements sécurisés" },
            ].map((s) => (
              <div key={s.label} className="px-6 py-8 text-center">
                <p className="font-serif text-3xl text-cream-50 font-medium tabular">{s.value}</p>
                <p className="text-[9px] uppercase tracking-widest text-stone2-500 mt-1.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PROBLEM / SOLUTION ───────────────────────────────────────── */}
      <section className="bg-cream-50 py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-center">
            <div>
              <h2
                className="font-serif text-4xl md:text-5xl font-medium text-brand-600 leading-[1.05]"
                style={{ textWrap: "balance" } as CSSProperties}
              >
                Gérer un studio boutique,
                <br />
                <span className="italic font-normal">c&apos;est jongler.</span>
              </h2>
            </div>
            <div className="space-y-6">
              <p className="text-stone2-600 leading-relaxed">
                Planning papier, tableurs, emails manuels, paiements en cash — la gestion d&apos;un studio
                boutique est souvent un patchwork d&apos;outils qui ne se parlent pas.
              </p>
              <p className="text-stone2-600 leading-relaxed">
                Ilannatek rassemble tout ce qu&apos;il vous faut dans une seule plateforme, pensée pour
                les studios à taille humaine. Vos membres ont une expérience premium. Vous, vous avez
                du temps.
              </p>
              <div className="pt-4 border-t border-stone2-100">
                <Link
                  href="/register"
                  className="text-[11px] uppercase tracking-[0.2em] text-accent-500 border-b border-accent-500/40 pb-1 hover:border-accent-500 transition-colors font-medium"
                >
                  Commencer gratuitement →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─────────────────────────────────────────────────── */}
      <section className="py-28 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="mb-20">
            <h2
              className="font-serif text-4xl md:text-5xl font-medium text-brand-600 leading-[1.05]"
              style={{ textWrap: "balance" } as CSSProperties}
            >
              Tout ce qu&apos;il faut.
              <br />
              <span className="italic font-normal text-stone2-400">Rien de superflu.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-px bg-stone2-100 border border-stone2-100">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white p-8 md:p-10">
                <p className="text-[10px] uppercase tracking-[0.22em] font-medium text-accent-500 mb-5">
                  {f.tag}
                </p>
                <h3 className="font-serif text-2xl text-brand-600 font-medium mb-4">{f.title}</h3>
                <p className="text-stone2-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ──────────────────────────────────────────────────── */}
      <section className="py-28 px-6 bg-cream-50">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <h2
              className="font-serif text-4xl md:text-5xl font-medium text-brand-600 leading-[1.05]"
              style={{ textWrap: "balance" } as CSSProperties}
            >
              Des tarifs qui s&apos;adaptent
              <br />
              <span className="italic font-normal">à votre studio.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col p-8 ${
                  plan.highlight
                    ? "bg-brand-600 text-cream-50"
                    : "bg-white border border-stone2-100"
                }`}
              >
                <div className="mb-6">
                  <p className={`text-[10px] uppercase tracking-[0.22em] font-medium mb-1 ${plan.highlight ? "text-accent-300" : "text-stone2-400"}`}>
                    {plan.name}
                  </p>
                  <p className={`text-sm mb-6 ${plan.highlight ? "text-stone2-300" : "text-stone2-500"}`}>
                    {plan.desc}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className={`font-serif text-4xl font-medium ${plan.highlight ? "text-cream-50" : "text-brand-600"}`}>
                      {plan.price}
                    </span>
                    <span className={`text-sm ${plan.highlight ? "text-stone2-400" : "text-stone2-400"}`}>
                      {plan.priceDetail}
                    </span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-3 text-sm">
                      <span className={`mt-0.5 shrink-0 text-xs font-bold ${plan.highlight ? "text-accent-300" : "text-accent-500"}`}>
                        ✓
                      </span>
                      <span className={plan.highlight ? "text-stone2-300" : "text-stone2-600"}>
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.ctaHref}
                  className={`block text-center py-3.5 text-[11px] uppercase tracking-[0.22em] font-semibold transition-colors ${
                    plan.highlight
                      ? "bg-accent-500 text-white hover:bg-accent-400"
                      : "border border-brand-600 text-brand-600 hover:bg-brand-600 hover:text-cream-50"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-[10px] uppercase tracking-widest text-stone2-400 mt-10">
            Paiement sécurisé · Stripe PCI DSS Level 1 · Résiliation en un clic
          </p>
        </div>
      </section>

      {/* ─── FINAL CTA ────────────────────────────────────────────────── */}
      <section className="py-32 px-6 bg-brand-600 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 50% 70% at 10% 50%, rgba(236,91,74,0.18) 0%, transparent 60%), radial-gradient(ellipse 40% 60% at 90% 50%, rgba(236,91,74,0.10) 0%, transparent 55%)",
          }}
        />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2
            className="font-serif font-medium text-cream-50 mb-6 leading-[0.95]"
            style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)", letterSpacing: "-0.025em" }}
          >
            Votre studio mérite
            <br />
            <span className="text-accent-300 italic font-normal">la bonne plateforme.</span>
          </h2>
          <p className="text-stone2-400 mb-12 max-w-md mx-auto leading-relaxed">
            Configurez votre espace en moins de 10 minutes.
            Premier studio gratuit, sans carte de crédit.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-10 py-4 bg-accent-500 text-white text-[11px] uppercase tracking-[0.25em] font-semibold hover:bg-accent-400 active:scale-[0.98] transition-all min-h-[54px]"
            >
              Créer mon studio gratuitement
            </Link>
            <Link
              href="/studio/ilannatek-paris"
              className="inline-flex items-center justify-center px-10 py-4 border border-cream-50/30 text-cream-50 text-[11px] uppercase tracking-[0.25em] font-medium hover:border-cream-50/60 transition-colors min-h-[54px]"
            >
              Voir la démo →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
