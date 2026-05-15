import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();
  return (
    <div className="space-y-16 py-10">
      <section className="text-center max-w-3xl mx-auto">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Bougez. Respirez. <span className="text-brand-600">Réservez.</span>
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Plateforme de réservation pour votre studio boutique. Cours en direct,
          crédits flexibles et abonnements illimités.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/schedule" className="btn-primary px-6 py-3 text-base">
            Voir le planning
          </Link>
          {!user && (
            <Link href="/register" className="btn-secondary px-6 py-3 text-base">
              Créer mon compte
            </Link>
          )}
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="font-semibold text-lg mb-2">📅 Planning en direct</h3>
          <p className="text-sm text-gray-600">
            Consultez tous les cours, instructeurs et créneaux disponibles en temps réel.
          </p>
        </div>
        <div className="card">
          <h3 className="font-semibold text-lg mb-2">🎟️ Crédits & packs</h3>
          <p className="text-sm text-gray-600">
            Achetez des crédits à l&apos;unité ou en pack pour réserver vos cours à la carte.
          </p>
        </div>
        <div className="card">
          <h3 className="font-semibold text-lg mb-2">♾️ Abonnements illimités</h3>
          <p className="text-sm text-gray-600">
            Optez pour un abonnement mensuel ou annuel et accédez à tous les cours.
          </p>
        </div>
      </section>
    </div>
  );
}
