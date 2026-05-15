import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatPrice } from "@/lib/utils";
import PurchaseButton from "./PurchaseButton";

export default async function PacksPage({
  searchParams,
}: {
  searchParams?: { from?: string };
}) {
  const user = await getCurrentUser();
  const packs = await db.plan.findMany({
    where: { type: "CREDIT_PACK", active: true },
    orderBy: { priceCents: "asc" },
  });

  // Mark the most expensive pack as featured
  const maxPrice = packs.length > 0 ? Math.max(...packs.map((p) => p.priceCents)) : 0;
  const fromSchedule = searchParams?.from === "schedule";

  return (
    <div className="space-y-10">
      <div>
        <p className="section-title">Studio Boutique</p>
        <h1 className="font-serif text-4xl md:text-5xl font-medium text-brand-600">
          Packs de crédits
        </h1>
        <p className="text-sm text-stone2-500 mt-2">
          Achetez des crédits utilisables pour toutes les réservations
        </p>
      </div>

      {fromSchedule && (
        <div className="border-l-4 border-accent-500 bg-accent-50 px-5 py-4">
          <p className="text-sm text-brand-600 font-medium">
            Solde insuffisant pour réserver
          </p>
          <p className="text-xs text-stone2-600 mt-1">
            Choisissez un pack ci-dessous, puis retournez au planning pour
            valider votre réservation.
          </p>
        </div>
      )}

      {!user && (
        <div className="border border-stone2-200 bg-cream-100 px-5 py-4">
          <p className="text-sm text-brand-600">
            <Link href="/login" className="font-semibold underline">
              Connectez-vous
            </Link>{" "}
            pour acheter des crédits.
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-5">
        {packs.map((p) => {
          const pricePerCredit = p.creditsAmount
            ? formatPrice(Math.round(p.priceCents / p.creditsAmount))
            : "-";
          const isFeatured = p.priceCents === maxPrice;
          return (
            <div
              key={p.id}
              className={`rounded-xl border flex flex-col gap-5 p-7 ${
                isFeatured
                  ? "bg-brand-600 border-brand-600 text-white"
                  : "bg-white border-gray-100"
              }`}
            >
              <h3
                className={`text-base font-semibold ${
                  isFeatured ? "text-white" : "text-gray-900"
                }`}
              >
                {p.name}
              </h3>

              {p.description && (
                <p
                  className={`text-sm ${
                    isFeatured ? "text-brand-100" : "text-gray-600"
                  }`}
                >
                  {p.description}
                </p>
              )}

              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-4xl font-bold ${
                      isFeatured ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {formatPrice(p.priceCents)}
                  </span>
                  <span
                    className={`text-sm ${
                      isFeatured ? "text-brand-200" : "text-gray-500"
                    }`}
                  >
                    / {p.creditsAmount} crédits
                  </span>
                </div>
                <p
                  className={`text-xs mt-1 ${
                    isFeatured ? "text-brand-200" : "text-gray-500"
                  }`}
                >
                  Soit {pricePerCredit} par crédit
                </p>
              </div>

              {user ? (
                <div className={isFeatured ? "[&_.btn-primary]:bg-white [&_.btn-primary]:text-brand-700 [&_.btn-primary]:hover:bg-brand-50" : ""}>
                  <PurchaseButton planId={p.id} />
                </div>
              ) : (
                <Link
                  href="/login"
                  className={`text-center rounded-md px-5 py-2.5 text-sm font-medium tracking-wide transition-colors ${
                    isFeatured
                      ? "bg-white text-brand-700 hover:bg-brand-50"
                      : "bg-brand-600 text-white hover:bg-brand-700"
                  }`}
                >
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
