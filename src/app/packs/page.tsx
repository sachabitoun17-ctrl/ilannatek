import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatPrice } from "@/lib/utils";
import PurchaseButton from "./PurchaseButton";

export default async function PacksPage() {
  const user = await getCurrentUser();
  const packs = await db.plan.findMany({
    where: { type: "CREDIT_PACK", active: true },
    orderBy: { priceCents: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Packs de crédits</h1>
        <p className="text-sm text-gray-500">
          Achetez des crédits utilisables pour toutes les réservations
        </p>
      </div>

      {!user && (
        <div className="card bg-brand-50 border-brand-200">
          <p className="text-sm">
            <Link href="/login" className="font-semibold underline">
              Connectez-vous
            </Link>{" "}
            pour acheter des crédits.
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {packs.map((p) => {
          const pricePerCredit = p.creditsAmount
            ? formatPrice(p.priceCents / p.creditsAmount)
            : "-";
          return (
            <div key={p.id} className="card flex flex-col gap-3">
              <h3 className="text-lg font-semibold">{p.name}</h3>
              {p.description && (
                <p className="text-sm text-gray-600">{p.description}</p>
              )}
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {formatPrice(p.priceCents)}
                </span>
                <span className="text-sm text-gray-500">
                  / {p.creditsAmount} crédits
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Soit {pricePerCredit} par crédit
              </p>
              {user ? (
                <PurchaseButton planId={p.id} />
              ) : (
                <Link href="/login" className="btn-primary text-center">
                  Se connecter
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
