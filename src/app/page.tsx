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
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-brand-600 to-pink-800 text-white py-24 px-6 -mx-4 md:-mx-8 overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <p className="text-pink-200 text-sm font-medium uppercase tracking-widest mb-3">
            Studio boutique
          </p>
          <h1 className="text-5xl md:text-6xl font-bold mb-5 leading-tight">
            {settings.studioName}
          </h1>
          <p className="text-xl text-pink-100 mb-10 max-w-xl mx-auto">
            Des cours qui vous ressemblent. Réservez en quelques secondes, annulez librement, progressez à votre rythme.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/schedule"
              className="bg-white text-brand-600 font-semibold px-8 py-3 rounded-lg hover:bg-pink-50 transition"
            >
              Voir le planning
            </Link>
            {!user ? (
              <Link
                href="/register"
                className="border-2 border-white text-white font-semibold px-8 py-3 rounded-lg hover:bg-white/10 transition"
              >
                Créer mon compte
              </Link>
            ) : (
              <Link
                href="/account"
                className="border-2 border-white text-white font-semibold px-8 py-3 rounded-lg hover:bg-white/10 transition"
              >
                Mon espace
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Comment ça marche ?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Choisissez votre cours",
                desc: "Consultez le planning en temps réel — par jour ou par semaine, filtrez par studio.",
              },
              {
                step: "02",
                title: "Réservez en un clic",
                desc: "Utilisez vos crédits ou votre abonnement. Confirmation instantanée par email.",
              },
              {
                step: "03",
                title: "Venez & profitez",
                desc: "Check-in QR à l'entrée ou via votre téléphone. Votre instructeur vous attend.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-600 font-bold text-lg flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Class types */}
      {classTypes.length > 0 && (
        <section className="py-16 px-4 bg-gray-50 -mx-4 md:-mx-8">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-3">Nos cours</h2>
            <p className="text-center text-gray-500 mb-10">
              Une offre pensée pour tous les niveaux
            </p>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {classTypes.map((ct) => (
                <div
                  key={ct.id}
                  className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition"
                >
                  <div
                    className="w-10 h-10 rounded-lg mb-3 flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: ct.color }}
                  >
                    {ct.name.slice(0, 2).toUpperCase()}
                  </div>
                  <h3 className="font-semibold mb-1">{ct.name}</h3>
                  {ct.description && (
                    <p className="text-sm text-gray-500 mb-2">{ct.description}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {ct.durationMin} min · {ct.creditCost} crédit
                    {ct.creditCost > 1 ? "s" : ""}
                  </p>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link href="/schedule" className="btn-primary px-8 py-3">
                Voir toutes les séances
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Instructors */}
      {instructors.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-3">Nos instructeurs</h2>
            <p className="text-center text-gray-500 mb-10">
              Des experts passionnés à votre écoute
            </p>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
              {instructors.map((inst) => (
                <div key={inst.id} className="card text-center">
                  <div className="w-16 h-16 rounded-full bg-brand-100 text-brand-600 font-bold text-xl flex items-center justify-center mx-auto mb-3">
                    {inst.firstName[0]}
                    {inst.lastName[0]}
                  </div>
                  <h3 className="font-semibold">
                    {inst.firstName} {inst.lastName}
                  </h3>
                  {inst.instructorBio && (
                    <p className="text-sm text-gray-500 mt-1">{inst.instructorBio}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing teaser */}
      <section className="py-16 px-4 bg-gray-50 -mx-4 md:-mx-8">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-3">Packs & Abonnements</h2>
          <p className="text-gray-500 mb-8">
            Flexible ou illimité — choisissez ce qui vous convient.
          </p>
          <div className="grid sm:grid-cols-2 gap-6 text-left">
            <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
              <p className="text-xs text-gray-500 uppercase font-medium mb-2">
                Crédits à la carte
              </p>
              <p className="text-2xl font-bold mb-2">Packs</p>
              <p className="text-sm text-gray-600 mb-4">
                Achetez un pack de crédits, utilisez-les quand vous voulez. Parfait si vous
                venez de temps en temps.
              </p>
              <Link href="/packs" className="btn-secondary w-full text-center block">
                Voir les packs
              </Link>
            </div>
            <div className="bg-brand-600 text-white rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-3 right-3 bg-white text-brand-600 text-xs font-bold px-2 py-0.5 rounded-full">
                Populaire
              </div>
              <p className="text-xs text-pink-200 uppercase font-medium mb-2">
                Accès illimité
              </p>
              <p className="text-2xl font-bold mb-2">Abonnements</p>
              <p className="text-sm text-pink-100 mb-4">
                Mensuel ou annuel, venez autant que vous voulez. La meilleure option si vous
                venez régulièrement.
              </p>
              <Link
                href="/subscriptions"
                className="bg-white text-brand-600 font-semibold w-full text-center block py-2 rounded-lg hover:bg-pink-50 transition"
              >
                Voir les abonnements
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      {!user && (
        <section className="py-20 px-4 text-center">
          <h2 className="text-3xl font-bold mb-3">Prêt à commencer ?</h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            Créez votre compte en 30 secondes et réservez votre premier cours dès
            aujourd'hui.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/register" className="btn-primary px-8 py-3 text-base">
              Créer mon compte gratuitement
            </Link>
            <Link href="/schedule" className="btn-secondary px-8 py-3 text-base">
              Voir le planning
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
