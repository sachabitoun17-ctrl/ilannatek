export const dynamic = "force-dynamic";
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

  const maxPrice = packs.length > 0 ? Math.max(...packs.map((p) => p.priceCents)) : 0;
  const fromSchedule = searchParams?.from === "schedule";

  return (
    <div className="space-y-10">
      <div>
        <p className="section-title">Studio Boutique</p>
        <h1 className="font-serif text-4xl md:text-5xl font-medium text-brand-600 mt-1">
          Packs de crédits
        </h1>
        <p className="text-sm text-stone2-500 mt-2">
          Achetez des crédits utilisables pour toutes les réservations
        </p>
      </div>

      {fromSchedule && (
        <div className="border-l-4 border-accent-500 bg-cream-100 px-5 py-4">
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
              className={`border flex flex-col gap-5 p-7 ${
                isFeatured
                  ? "bg-brand-600 border-brand-600"
                  : "bg-white border-stone2-100"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3
                  className={`text-base font-semibold tracking-wide ${
                    isFeatured ? "text-cream-50" : "text-brand-600"
                  }`}
                >
                  {p.name}
                </h3>
                {isFeatured && (
                  <span className="badge bg-accent-500 text-cream-50 text-[9px]">
                    Populaire
                  </span>
                )}
              </div>

              {p.description && (
                <p
                  className={`text-sm ${
                    isFeatured ? "text-stone2-300" : "text-stone2-600"
                  }`}
                >
                  {p.description}
                </p>
              )}

              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span
                    className={`font-serif text-4xl font-medium ${
                      isFeatured ? "text-cream-50" : "text-brand-600"
                    }`}
                  >
                    {formatPrice(p.priceCents)}
                  </span>
                  <span
                    className={`text-sm ${
                      isFeatured ? "text-stone2-400" : "text-stone2-500"
                    }`}
                  >
                    / {p.creditsAmount} crédits
                  </span>
                </div>
                <p
                  className={`text-xs mt-1 ${
                    isFeatured ? "text-stone2-400" : "text-stone2-500"
                  }`}
                >
                  Soit {pricePerCredit} par crédit
                </p>
              </div>

              {user ? (
                <div
                  className={
                    isFeatured
                      ? "[&_.btn-primary]:bg-cream-50 [&_.btn-primary]:text-brand-600 [&_.btn-primary]:hover:bg-accent-200"
                      : ""
                  }
                >
                  <PurchaseButton planId={p.id} />
                </div>
              ) : (
                <Link
                  href="/login"
                  className={`text-center px-5 py-3 text-[11px] uppercase tracking-[0.18em] transition-colors ${
                    isFeatured
                      ? "bg-cream-50 text-brand-600 hover:bg-accent-200"
                      : "bg-brand-600 text-cream-50 hover:bg-brand-700"
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
