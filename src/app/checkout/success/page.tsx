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
    <div className="max-w-xl mx-auto py-16 text-center space-y-6">
      <div className="text-6xl">🎉</div>
      <h1 className="text-3xl font-bold">Merci pour votre achat !</h1>
      <p className="text-gray-600">
        {plan
          ? `Votre achat de "${plan.name}" est confirmé. Les crédits sont sur votre compte.`
          : "Votre achat est confirmé."}
      </p>
      <p className="text-xs text-gray-500">
        Si le paiement transite par Stripe, le solde peut prendre quelques secondes
        à apparaître le temps que le webhook arrive.
      </p>
      <div className="flex justify-center gap-3">
        <Link href="/schedule" className="btn-primary">
          Voir le planning
        </Link>
        <Link href="/account" className="btn-secondary">
          Mon compte
        </Link>
      </div>
    </div>
  );
}
