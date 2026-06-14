export const dynamic = "force-dynamic";
import { requireAdmin } from "@/lib/auth";

export default async function AdminExportPage() {
  await requireAdmin();
  return (
    <div className="space-y-8">
      <div>
        <p className="section-title">Administration</p>
        <h1 className="font-serif text-4xl font-medium text-brand-600 mt-1">
          Export données
        </h1>
        <p className="text-sm text-stone2-500 mt-2">
          Téléchargez vos données au format CSV pour les analyser dans Excel ou tout autre tableur.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {/* Members export */}
        <div className="card space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone2-400 mb-1">
              Membres
            </p>
            <h2 className="font-serif text-2xl text-brand-600">Exporter membres</h2>
            <p className="text-sm text-stone2-500 mt-2 leading-relaxed">
              ID, email, prénom, nom, téléphone, rôle, crédits, date d'inscription
            </p>
          </div>
          <a
            href="/api/admin/export/users"
            className="btn-primary block text-center"
            download
          >
            Télécharger CSV
          </a>
        </div>

        {/* Transactions export */}
        <div className="card space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone2-400 mb-1">
              Transactions
            </p>
            <h2 className="font-serif text-2xl text-brand-600">Exporter transactions</h2>
            <p className="text-sm text-stone2-500 mt-2 leading-relaxed">
              ID, membre, type, montant, crédits, statut paiement, date
            </p>
          </div>
          <a
            href="/api/admin/export/transactions"
            className="btn-primary block text-center"
            download
          >
            Télécharger CSV
          </a>
        </div>

        {/* Bookings export */}
        <div className="card space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone2-400 mb-1">
              Réservations
            </p>
            <h2 className="font-serif text-2xl text-brand-600">Exporter réservations</h2>
            <p className="text-sm text-stone2-500 mt-2 leading-relaxed">
              ID, membre, date séance, type de cours, statut, crédits utilisés
            </p>
          </div>
          <a
            href="/api/admin/export/bookings"
            className="btn-primary block text-center"
            download
          >
            Télécharger CSV
          </a>
        </div>
      </div>

      <div className="text-xs text-stone2-400 border-t border-stone2-100 pt-6">
        Les exports incluent toutes les données disponibles dans la base. Les fichiers sont encodés en UTF-8.
      </div>
    </div>
  );
}
