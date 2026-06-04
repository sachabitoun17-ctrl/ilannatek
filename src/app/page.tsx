export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export default async function Home() {
  const [user, settings, classTypes, instructors] = await Promise.all([
    getCurrentUser(),
    getSettings(),
    db.classType.findMany({ where: { active: true }, take: 6 }),
    db.user.findMany({
      where: { role: "INSTRUCTOR", active: true },
      take: 6,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        instructorBio: true,
        instructorPhoto: true,
      },
    }),
  ]);

  return (
    <div className="-mx-4 md:-mx-8 -my-10">

      {/* Hero */}
      <section className="relative bg-brand-600 text-cream-50 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 60% 80% at 15% 20%, rgba(188,148,74,0.12) 0%, transparent 60%), radial-gradient(ellipse 50% 60% at 85% 80%, rgba(160,123,58,0.10) 0%, transparent 55%)",
          }}
        />
        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-28 pb-32 md:pt-40 md:pb-44">
          <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-accent-300 mb-8">
            Studio Boutique · Paris
          </p>
          <h1 className="font-serif font-medium leading-[0.9] text-cream-50 mb-10"
            style={{ fontSize: "clamp(3.5rem, 10vw, 7rem)" }}>
            {settings.studioName}
            <br />
            <span className="italic font-normal text-accent-300">le sanctuaire</span>
          </h1>
          <p className="text-stone2-300 font-light leading-loose mb-12 max-w-lg"
            style={{ fontSize: "clamp(0.9rem, 2vw, 1.1rem)" }}>
            Un lieu. Une pratique. Un rythme.
            <br />
            Réservez votre prochaine séance en quelques secondes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/schedule"
              className="inline-flex items-center justify-center px-9 py-4 bg-cream-50 text-brand-600 text-[11px] uppercase tracking-[0.22em] font-semibold hover:bg-accent-200 transition-colors min-h-[52px]"
            >
              Voir le planning
            </Link>
            {!user ? (
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-9 py-4 border border-cream-50/40 text-cream-50 text-[11px] uppercase tracking-[0.22em] font-medium hover:border-cream-50 hover:bg-cream-50/10 transition-colors min-h-[52px]"
              >
                Créer mon compte
              </Link>
            ) : (
              <Link
                href="/account"
                className="inline-flex items-center justify-center px-9 py-4 border border-cream-50/40 text-cream-50 text-[11px] uppercase tracking-[0.22em] font-medium hover:border-cream-50 hover:bg-cream-50/10 transition-colors min-h-[52px]"
              >
                Mon espace
              </Link>
            )}
          </div>
        </div>

        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-400/40 to-transparent" />
      </section>

      {/* How it works */}
      <section className="bg-cream-50 py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <p className="section-title mb-3">Comment ça marche</p>
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
        </div>
      </section>

      {/* Class types */}
      {classTypes.length > 0 && (
        <section className="py-28 px-6 bg-brand-600">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-accent-300 mb-3">
                  Nos pratiques
                </p>
                <h2 className="font-serif text-4xl md:text-5xl font-medium text-cream-50 leading-tight">
                  Une offre boutique
                </h2>
              </div>
              <Link
                href="/schedule"
                className="inline-flex items-center text-[11px] uppercase tracking-[0.22em] text-cream-50 border-b border-cream-50/40 pb-1 hover:border-cream-50 hover:text-accent-300 transition-colors shrink-0"
              >
                Toutes les séances
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
                  <h3 className="font-serif text-2xl text-cream-50 mb-3 font-medium">
                    {ct.name}
                  </h3>
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

      {/* Instructors */}
      {instructors.length > 0 && (
        <section className="py-28 px-6 bg-cream-50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-20">
              <p className="section-title mb-3">L&apos;équipe</p>
              <h2 className="font-serif text-4xl md:text-5xl font-medium text-brand-600 leading-tight">
                Vos instructeurs
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-10">
              {instructors.map((inst) => (
                <div key={inst.id} className="flex items-start gap-5">
                  <div className="w-14 h-14 rounded-full bg-stone2-800 text-cream-50 font-serif text-xl flex items-center justify-center shrink-0 mt-1">
                    {inst.firstName[0]}{inst.lastName[0]}
                  </div>
                  <div>
                    <h3 className="font-serif text-xl text-brand-600 font-medium">
                      {inst.firstName} {inst.lastName}
                    </h3>
                    {inst.instructorBio && (
                      <p className="text-sm text-stone2-500 mt-1.5 leading-relaxed line-clamp-3">
                        {inst.instructorBio}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing teaser */}
      <section className="py-28 px-6 bg-cream-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="section-title mb-3">Tarifs</p>
            <h2 className="font-serif text-4xl md:text-5xl font-medium text-brand-600 leading-tight">
              Flexible ou illimité —
              <br />
              à vous de choisir.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-px bg-stone2-200 border border-stone2-200">
            <div className="bg-white p-10">
              <p className="text-[10px] uppercase tracking-[0.28em] text-stone2-400 mb-4">
                À la carte
              </p>
              <h3 className="font-serif text-4xl text-brand-600 font-medium mb-4">
                Crédits
              </h3>
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
                Illimité
              </p>
              <h3 className="font-serif text-4xl text-brand-600 font-medium mb-4">
                Abonnement
              </h3>
              <p className="text-stone2-500 text-sm leading-relaxed mb-8">
                Mensuel ou annuel. Venez autant que vous voulez.
                La meilleure option pour les habitué·e·s.
              </p>
              <Link href="/subscriptions" className="btn-primary">
                Voir les abonnements
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      {!user && (
        <section className="py-28 px-6 bg-brand-600 text-center">
          <p className="text-[10px] uppercase tracking-[0.35em] text-accent-300 mb-6">
            Rejoignez-nous
          </p>
          <h2 className="font-serif font-medium text-cream-50 mb-6 leading-[0.95]"
            style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}>
            Prêt·e à commencer ?
          </h2>
          <p className="text-stone2-300 mb-12 max-w-sm mx-auto text-sm leading-relaxed">
            Créez votre compte en 30 secondes.
            Votre premier cours n&apos;attend plus que vous.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link href="/register" className="inline-flex items-center justify-center px-9 py-4 bg-cream-50 text-brand-600 text-[11px] uppercase tracking-[0.22em] font-semibold hover:bg-accent-200 transition-colors min-h-[52px]">
              Créer mon compte
            </Link>
            <Link href="/schedule" className="inline-flex items-center justify-center px-9 py-4 border border-cream-50/40 text-cream-50 text-[11px] uppercase tracking-[0.22em] font-medium hover:border-cream-50 hover:bg-cream-50/10 transition-colors min-h-[52px]">
              Voir le planning
            </Link>
          </div>
        </section>
      )}

    </div>
  );
}
