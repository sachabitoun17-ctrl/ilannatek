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
      <section className="bg-brand-600 text-cream-50 px-6 pt-32 pb-28 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, #A07B3A 0%, transparent 40%), radial-gradient(circle at 80% 70%, #BC944A 0%, transparent 40%)",
          }}
        />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <p className="text-accent-300 text-[10px] font-semibold uppercase tracking-[0.35em] mb-6">
            Studio Boutique · Paris
          </p>
          <h1 className="font-serif text-6xl md:text-7xl font-medium mb-8 leading-[0.95] text-cream-50">
            {settings.studioName}
            <br />
            <span className="text-accent-300 italic font-normal">le sanctuaire</span>
          </h1>
          <p className="text-base md:text-lg text-stone2-300 mb-12 max-w-xl mx-auto font-light leading-relaxed">
            Un lieu, une pratique, un rythme.<br />
            Réservez votre cours en quelques secondes.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/schedule"
              className="inline-flex items-center px-8 py-4 bg-cream-50 text-brand-600 text-[11px] uppercase tracking-[0.22em] font-medium hover:bg-accent-300 transition-colors"
            >
              Voir le planning
            </Link>
            {!user ? (
              <Link
                href="/register"
                className="inline-flex items-center px-8 py-4 border border-cream-50 text-cream-50 text-[11px] uppercase tracking-[0.22em] font-medium hover:bg-cream-50 hover:text-brand-600 transition-colors"
              >
                Créer mon compte
              </Link>
            ) : (
              <Link
                href="/account"
                className="inline-flex items-center px-8 py-4 border border-cream-50 text-cream-50 text-[11px] uppercase tracking-[0.22em] font-medium hover:bg-cream-50 hover:text-brand-600 transition-colors"
              >
                Mon espace
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-cream-50 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="section-title text-center mb-2">Le parcours</p>
          <h2 className="font-serif text-4xl md:text-5xl text-center font-medium mb-16 text-brand-600">
            Comment ça marche
          </h2>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                step: "01",
                title: "Choisir",
                desc: "Consultez le planning, filtrez par studio, par horaire, par instructeur.",
              },
              {
                step: "02",
                title: "Réserver",
                desc: "Confirmation instantanée par email. Un crédit, et c'est validé.",
              },
              {
                step: "03",
                title: "Venir",
                desc: "Check-in à l'entrée du studio. Profitez. Recommencez.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <p className="font-serif text-5xl text-accent-500 mb-4">
                  {item.step}
                </p>
                <h3 className="font-serif text-2xl text-brand-600 mb-3">
                  {item.title}
                </h3>
                <p className="text-stone2-500 text-sm leading-relaxed max-w-[260px] mx-auto">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Class types */}
      {classTypes.length > 0 && (
        <section className="py-24 px-6 bg-cream-100">
          <div className="max-w-6xl mx-auto">
            <p className="section-title text-center mb-2">Nos pratiques</p>
            <h2 className="font-serif text-4xl md:text-5xl text-center font-medium mb-16 text-brand-600">
              Une offre boutique
            </h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-px bg-stone2-200 border border-stone2-200">
              {classTypes.map((ct) => (
                <div
                  key={ct.id}
                  className="bg-cream-50 p-8 hover:bg-white transition-colors"
                >
                  <div
                    className="h-1 w-12 mb-5"
                    style={{ backgroundColor: ct.color }}
                  />
                  <h3 className="font-serif text-2xl text-brand-600 mb-2">
                    {ct.name}
                  </h3>
                  {ct.description && (
                    <p className="text-stone2-500 text-sm mb-4 leading-relaxed">
                      {ct.description}
                    </p>
                  )}
                  <p className="text-[10px] uppercase tracking-widest text-stone2-400">
                    {ct.durationMin} min · {ct.creditCost} crédit
                    {ct.creditCost > 1 ? "s" : ""}
                  </p>
                </div>
              ))}
            </div>
            <div className="text-center mt-12">
              <Link href="/schedule" className="btn-primary">
                Toutes les séances
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Instructors */}
      {instructors.length > 0 && (
        <section className="py-24 px-6 bg-cream-50">
          <div className="max-w-5xl mx-auto">
            <p className="section-title text-center mb-2">L'équipe</p>
            <h2 className="font-serif text-4xl md:text-5xl text-center font-medium mb-16 text-brand-600">
              Nos instructeurs
            </h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8">
              {instructors.map((inst) => (
                <div key={inst.id} className="text-center">
                  <div className="w-20 h-20 rounded-full bg-stone2-200 text-brand-600 font-serif text-2xl flex items-center justify-center mx-auto mb-4">
                    {inst.firstName[0]}
                    {inst.lastName[0]}
                  </div>
                  <h3 className="font-serif text-xl text-brand-600">
                    {inst.firstName} {inst.lastName}
                  </h3>
                  {inst.instructorBio && (
                    <p className="text-sm text-stone2-500 mt-2 leading-relaxed">
                      {inst.instructorBio}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing teaser */}
      <section className="py-24 px-6 bg-brand-600 text-cream-50">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent-300 mb-2">
            Tarifs
          </p>
          <h2 className="font-serif text-4xl md:text-5xl font-medium mb-4">
            Packs &amp; Abonnements
          </h2>
          <p className="text-stone2-300 mb-12 max-w-xl mx-auto">
            Flexible ou illimité. Choisissez ce qui correspond à votre rythme.
          </p>
          <div className="grid sm:grid-cols-2 gap-px bg-brand-700">
            <div className="bg-brand-600 p-10 text-left">
              <p className="text-[10px] uppercase tracking-[0.25em] text-accent-300 mb-3">
                À la carte
              </p>
              <p className="font-serif text-3xl mb-3">Crédits</p>
              <p className="text-sm text-stone2-300 mb-6 leading-relaxed">
                Achetez des crédits, utilisez-les quand vous voulez. Parfait pour
                une pratique occasionnelle.
              </p>
              <Link
                href="/packs"
                className="inline-flex items-center text-[11px] uppercase tracking-[0.22em] text-cream-50 border-b border-cream-50 pb-1 hover:text-accent-300 hover:border-accent-300"
              >
                Voir les packs →
              </Link>
            </div>
            <div className="bg-brand-600 p-10 text-left relative">
              <span className="absolute top-4 right-4 text-[9px] uppercase tracking-widest px-2 py-1 bg-accent-500 text-brand-600 font-semibold">
                Populaire
              </span>
              <p className="text-[10px] uppercase tracking-[0.25em] text-accent-300 mb-3">
                Illimité
              </p>
              <p className="font-serif text-3xl mb-3">Abonnements</p>
              <p className="text-sm text-stone2-300 mb-6 leading-relaxed">
                Mensuel ou annuel. Venez autant que vous voulez. La meilleure
                option pour les habitué·e·s.
              </p>
              <Link
                href="/subscriptions"
                className="inline-flex items-center text-[11px] uppercase tracking-[0.22em] text-cream-50 border-b border-cream-50 pb-1 hover:text-accent-300 hover:border-accent-300"
              >
                Voir les abonnements →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      {!user && (
        <section className="py-24 px-6 bg-cream-50 text-center">
          <h2 className="font-serif text-4xl md:text-5xl font-medium mb-4 text-brand-600">
            Prêt·e à commencer ?
          </h2>
          <p className="text-stone2-500 mb-10 max-w-md mx-auto">
            Créez votre compte en 30 secondes. Réservez votre premier cours aujourd'hui.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/register" className="btn-primary">
              Créer mon compte
            </Link>
            <Link href="/schedule" className="btn-secondary">
              Voir le planning
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
