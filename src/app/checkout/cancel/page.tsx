import Link from "next/link";

export default function CheckoutCancel() {
  return (
    <div className="max-w-xl mx-auto py-16 text-center space-y-4 px-4">
      <div className="w-14 h-14 mx-auto border border-stone2-200 flex items-center justify-center">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone2-500">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>
      <h1 className="font-serif text-3xl font-medium text-brand-600">Paiement annulé</h1>
      <p className="text-stone2-600">
        Pas de souci, aucune somme n&apos;a été débitée. Vous pouvez réessayer
        quand vous voulez.
      </p>
      <Link href="/packs" className="btn-primary inline-block">
        Retour aux packs
      </Link>
    </div>
  );
}
