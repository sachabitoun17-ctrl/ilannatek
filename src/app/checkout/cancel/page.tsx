import Link from "next/link";

export default function CheckoutCancel() {
  return (
    <div className="max-w-xl mx-auto py-16 text-center space-y-4">
      <h1 className="text-2xl font-bold">Paiement annulé</h1>
      <p className="text-gray-600">
        Pas de souci, aucune somme n&apos;a été débitée. Vous pouvez réessayer
        quand vous voulez.
      </p>
      <Link href="/packs" className="btn-primary inline-block">
        Retour aux packs
      </Link>
    </div>
  );
}
