export const dynamic = "force-dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export default async function WelcomePage() {
  const user = await requireUser();
  const [settings, nextSession, bookingCount] = await Promise.all([
    getSettings(),
    db.session.findFirst({
      where: {
        startTime: { gt: new Date() },
        status: "SCHEDULED",
      },
      orderBy: { startTime: "asc" },
      include: { classType: true, location: true, instructor: true },
    }),
    db.booking.count({ where: { userId: user.id } }),
  ]);

  if (bookingCount > 3) redirect("/account");

  const steps = [
    {
      number: "01",
      title: "Réservez votre premier cours",
      desc: "Parcourez le planning, choisissez un créneau et réservez en un clic. Votre crédit de bienvenue est déjà là.",
      cta: "Voir le planning",
      href: "/schedule",
      accent: true,
    },
    {
      number: "02",
      title: "Invitez un ami",
      desc: "Parrainez un proche et gagnez chacun 1 crédit offert. Le Mode Duo rend le sport plus sympa.",
      cta: "Inviter un ami",
      href: "/invite",
      accent: false,
    },
    {
      number: "03",
      title: "Explorez les abonnements",
      desc: "Pour une pratique régulière, nos abonnements mensuels et annuels offrent la meilleure valeur.",
      cta: "Voir les offres",
      href: "/packs",
      accent: false,
    },
  ];

  return (
    <div className="-mx-4 md:-mx-8 -my-10">
      {/* Hero bienvenue */}
      <section className="bg-brand-600 text-cream-50 px-6 pt-24 pb-20 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 50%, #A07B3A 0%, transparent 50%), radial-gradient(circle at 85% 20%, #BC944A 0%, transparent 40%)",
          }}
        />
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <p className="text-accent-300 text-[10px] font-semibold uppercase tracking-[0.35em] mb-5">
            Bienvenue chez {settings.studioName}
          </p>
          <h1 className="font-serif text-5xl md:text-6xl font-medium mb-5 text-cream-50 leading-tight">
            Bonjour,{" "}
            <span className="text-accent-300 italic font-normal">
              {user.firstName}
            </span>
          </h1>
          <p className="text-stone2-300 text-base md:text-lg leading-relaxed mb-10 max-w-lg mx-auto">
            Votre compte est prêt. Vous avez{" "}
            <span className="text-accent-300 font-semibold">
              {user.creditsBalance} crédit{user.creditsBalance > 1 ? "s" : ""}
            </span>{" "}
            disponible{user.creditsBalance > 1 ? "s" : ""} — suffisant pour réserver votre premier cours.
          </p>

          {nextSession && (
            <div className="inline-block bg-white/10 border border-white/20 px-6 py-4 text-left mb-8 max-w-sm w-full">
              <p className="text-[9px] uppercase tracking-[0.3em] text-accent-300 mb-2">
                Prochain cours disponible
              </p>
              <p className="font-serif text-xl text-cream-50 mb-1">
                {nextSession.classType.name}
              </p>
              <p className="text-sm text-stone2-300">
                {nextSession.startTime.toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}{" "}
                à{" "}
                {nextSession.startTime.toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {nextSession.location && ` · ${nextSession.location.name}`}
              </p>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/schedule"
              className="inline-flex items-center px-8 py-4 bg-cream-50 text-brand-600 text-[11px] uppercase tracking-[0.22em] font-medium hover:bg-accent-300 transition-colors"
            >
              Réserver maintenant →
            </Link>
            <Link
              href="/account"
              className="inline-flex items-center px-8 py-4 border border-cream-50/40 text-cream-50/80 text-[11px] uppercase tracking-[0.22em] font-medium hover:border-cream-50 hover:text-cream-50 transition-colors"
            >
              Mon espace
            </Link>
          </div>
        </div>
      </section>

      {/* Crédits highlight */}
      <section className="bg-accent-50 border-y border-accent-200 px-6 py-8">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-accent-500 flex items-center justify-center shrink-0">
              <span className="font-serif text-xl text-brand-600 font-bold">
                {user.creditsBalance}
              </span>
            </div>
            <div>
              <p className="font-medium text-brand-600 text-sm">
                Crédit{user.creditsBalance > 1 ? "s" : ""} de bienvenue offert{user.creditsBalance > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-stone2-500">
                Valables sur tous nos cours. Utilisez-les dès maintenant.
              </p>
            </div>
          </div>
          <Link href="/schedule" className="btn-primary shrink-0">
            Utiliser mes crédits
          </Link>
        </div>
      </section>

      {/* 3 étapes */}
      <section className="bg-cream-50 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="section-title text-center mb-2">Pour démarrer</p>
          <h2 className="font-serif text-4xl md:text-5xl text-center font-medium mb-16 text-brand-600">
            3 choses à faire en premier
          </h2>

          <div className="space-y-4">
            {steps.map((step) => (
              <div
                key={step.number}
                className={`flex flex-col sm:flex-row items-start sm:items-center gap-6 p-7 border ${
                  step.accent
                    ? "bg-brand-600 border-brand-600 text-cream-50"
                    : "bg-white border-stone2-200"
                }`}
              >
                <p
                  className={`font-serif text-5xl shrink-0 ${
                    step.accent ? "text-accent-300" : "text-accent-500"
                  }`}
                >
                  {step.number}
                </p>
                <div className="flex-1 min-w-0">
                  <h3
                    className={`font-serif text-2xl mb-2 ${
                      step.accent ? "text-cream-50" : "text-brand-600"
                    }`}
                  >
                    {step.title}
                  </h3>
                  <p
                    className={`text-sm leading-relaxed ${
                      step.accent ? "text-stone2-300" : "text-stone2-500"
                    }`}
                  >
                    {step.desc}
                  </p>
                </div>
                <Link
                  href={step.href}
                  className={`shrink-0 inline-flex items-center px-6 py-3 text-[11px] uppercase tracking-[0.18em] font-medium transition-colors whitespace-nowrap ${
                    step.accent
                      ? "bg-cream-50 text-brand-600 hover:bg-accent-300"
                      : "border border-brand-600 text-brand-600 hover:bg-brand-600 hover:text-cream-50"
                  }`}
                >
                  {step.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features showcase */}
      <section className="bg-cream-100 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="section-title text-center mb-2">Ce qui vous attend</p>
          <h2 className="font-serif text-4xl text-center font-medium mb-14 text-brand-600">
            Tout ce dont vous avez besoin
          </h2>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-px bg-stone2-200 border border-stone2-200">
            {[
              {
                icon: "◉",
                title: "Planning live",
                desc: "Planning mis à jour en temps réel. Filtrez par studio, par cours, par instructeur.",
              },
              {
                icon: "○",
                title: "Liste d'attente",
                desc: "Cours complet ? Inscrivez-vous en liste d'attente. Vous êtes automatiquement notifié si une place se libère.",
              },
              {
                icon: "◈",
                title: "Créneaux récurrents",
                desc: "Activez un créneau et soyez réservé automatiquement chaque semaine sans effort.",
              },
              {
                icon: "◇",
                title: "Rappels automatiques",
                desc: "Email de rappel J-1 et 2h avant chaque cours. Vous n'oublierez plus rien.",
              },
              {
                icon: "◆",
                title: "Mode Duo",
                desc: "Invitez un ami, gagnez un crédit chacun. Le sport est meilleur à deux.",
              },
              {
                icon: "◎",
                title: "Vos stats",
                desc: "Suivez votre série, vos cours du mois, et recommandations personnalisées.",
              },
            ].map((f) => (
              <div key={f.title} className="bg-cream-50 p-7 hover:bg-white transition-colors">
                <p className="text-2xl text-accent-500 mb-4">{f.icon}</p>
                <h3 className="font-medium text-brand-600 mb-2">{f.title}</h3>
                <p className="text-sm text-stone2-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-brand-600 py-20 px-6 text-center">
        <p className="text-accent-300 text-[10px] uppercase tracking-[0.3em] mb-3">
          C'est parti
        </p>
        <h2 className="font-serif text-4xl md:text-5xl text-cream-50 font-medium mb-4">
          Votre premier cours vous attend
        </h2>
        <p className="text-stone2-300 mb-10 max-w-md mx-auto">
          Le planning est mis à jour en continu. Trouvez le cours qui vous correspond et réservez en quelques secondes.
        </p>
        <Link href="/schedule" className="inline-flex items-center px-10 py-4 bg-cream-50 text-brand-600 text-[11px] uppercase tracking-[0.22em] font-medium hover:bg-accent-300 transition-colors">
          Voir tous les cours →
        </Link>
      </section>
    </div>
  );
}
