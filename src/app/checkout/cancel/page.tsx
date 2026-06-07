import Link from "next/link";

export default function CheckoutCancel() {
  return (
    <div className="max-w-xl mx-auto py-16 text-center space-y-4 px-4">
      <p className="text-4xl">↩</p>
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
