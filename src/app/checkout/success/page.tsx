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
      <div className="text-6xl">🎉</div>
      <h1 className="font-serif text-4xl font-medium text-brand-600">Merci pour votre achat !</h1>
      <p className="text-stone2-600">
        {plan
          ? `Votre achat de "${plan.name}" est confirmé. Les crédits sont sur votre compte.`
          : "Votre achat est confirmé."}
      </p>
      <p className="text-xs text-stone2-400">
        Si le paiement transite par Stripe, le solde peut prendre quelques secondes
        à apparaître le temps que le webhook arrive.
      </p>
      <div className="flex justify-center gap-3 flex-wrap">
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
