import Link from "next/link";
import { db } from "@/lib/db";

export default async function CheckoutSuccess({
  searchParams,
}: {
  searchParams: { plan?: string };
}) {
  const plan = searchParams.plan
    ? await db.plan.findUnique({ where: { id: searchParams.plan } })
    : null;
  return (
    <div className="max-w-xl mx-auto py-16 text-center space-y-6 px-4">
      <div className="w-14 h-14 mx-auto border-2 border-brand-600 flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-600">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h1 className="font-serif text-4xl font-medium text-brand-600">Paiement confirmé</h1>
      <p className="text-stone2-600">
        {plan
          ? `Votre achat "${plan.name}" est bien enregistré. Les crédits sont disponibles sur votre compte.`
          : "Votre achat est confirmé. Les crédits sont disponibles sur votre compte."}
      </p>
      <p className="text-xs text-stone2-400 border border-stone2-100 inline-block px-4 py-2">
        Paiement sécurisé · Traité par Stripe · PCI DSS Level 1
      </p>
      <div className="flex justify-center gap-3 flex-wrap pt-2">
        <Link href="/schedule" className="btn-primary">
          Réserver un cours
        </Link>
        <Link href="/account" className="btn-secondary">
          Mon compte
        </Link>
      </div>
    </div>
  );
}
