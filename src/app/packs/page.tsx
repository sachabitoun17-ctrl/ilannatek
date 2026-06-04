export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCachedPlans } from "@/lib/cached";
import { formatPrice } from "@/lib/utils";
import PurchaseButton from "./PurchaseButton";

export default async function PacksPage({
  searchParams,
}: {
  searchParams?: { from?: string };
}) {
  const [user, allPlans] = await Promise.all([getCurrentUser(), getCachedPlans()]);
  const packs = allPlans.filter((p) => p.type === "CREDIT_PACK");

  const maxPrice = packs.length > 0 ? Math.max(...packs.map((p) => p.priceCents)) : 0;
  const fromSchedule = searchParams?.from === "schedule";

  return (
    <div className="space-y-12">

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-stone2-100">
        <div>
          <p className="section-title mb-3">Studio Boutique</p>
          <h1 className="font-serif text-4xl md:text-5xl font-medium text-brand-600 leading-tight">
            Packs de crédits
          </h1>
          <p className="text-sm text-stone2-500 mt-2">
            Achetez des crédits, réservez quand vous voulez.
          </p>
        </div>
        <Link href="/subscriptions" className="text-[11px] uppercase tracking-[0.2em] text-stone2-500 hover:text-brand-600 transition-colors border-b border-stone2-300 pb-1">
          Voir les abonnements
        </Link>
      </div>

      {fromSchedule && (
        <div className="bg-brand-600 text-cream-50 px-6 py-5 flex items-start gap-4">
          <div className="w-1 h-full bg-accent-400 shrink-0 self-stretch" />
          <div>
            <p className="font-semibold text-sm mb-1">Solde insuffisant pour réserver</p>
            <p className="text-xs text-stone2-300">
              Choisissez un pack ci-dessous, puis retournez au planning pour finaliser votre réservation.
            </p>
          </div>
        </div>
      )}

      {!user && (
        <div className="bg-cream-100 border border-stone2-200 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-brand-600">
            Connectez-vous pour acheter des crédits.
          </p>
          <Link href="/login" className="btn-primary text-xs py-2">
            Se connecter
          </Link>
        </div>
      )}

      {/* Pack cards */}
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
        {packs.map((p) => {
          const pricePerCredit = p.creditsAmount
            ? formatPrice(Math.round(p.priceCents / p.creditsAmount))
            : "-";
          const isFeatured = p.priceCents === maxPrice;
          return (
            <div
              key={p.id}
              className={`relative flex flex-col border transition-shadow hover:shadow-md ${
                isFeatured
                  ? "bg-brand-600 border-brand-600"
                  : "bg-white border-stone2-100 hover:border-stone2-300"
              }`}
            >
              {isFeatured && (
                <div className="bg-accent-400 text-brand-600 text-[9px] font-semibold uppercase tracking-widest text-center py-1.5">
                  Meilleure valeur
                </div>
              )}

              <div className="flex flex-col flex-1 p-7 gap-5">
                <div>
                  <p className={`text-[10px] uppercase tracking-[0.22em] mb-2 ${isFeatured ? "text-accent-300" : "text-stone2-400"}`}>
                    {p.creditsAmount} crédits
                  </p>
                  <h3 className={`font-serif text-2xl font-medium mb-1 ${isFeatured ? "text-cream-50" : "text-brand-600"}`}>
                    {p.name}
                  </h3>
                  {p.description && (
                    <p className={`text-sm leading-relaxed ${isFeatured ? "text-stone2-300" : "text-stone2-500"}`}>
                      {p.description}
                    </p>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className={`font-serif font-medium leading-none ${isFeatured ? "text-cream-50" : "text-brand-600"}`}
                      style={{ fontSize: "clamp(2rem, 5vw, 2.75rem)" }}>
                      {formatPrice(p.priceCents)}
                    </span>
                  </div>
                  <p className="text-xs mt-2 text-stone2-400">
                    Soit {pricePerCredit} par crédit
                  </p>
                </div>

                {user ? (
                  <div className={isFeatured
                    ? "[&_.btn-primary]:bg-cream-50 [&_.btn-primary]:text-brand-600 [&_.btn-primary]:hover:bg-accent-200"
                    : ""
                  }>
                    <PurchaseButton planId={p.id} />
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className={`text-center min-h-[48px] flex items-center justify-center text-[11px] uppercase tracking-[0.18em] font-medium transition-colors ${
                      isFeatured
                        ? "bg-cream-50 text-brand-600 hover:bg-accent-200"
                        : "bg-brand-600 text-cream-50 hover:bg-brand-700"
                    }`}
                  >
                    Se connecter pour acheter
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison note */}
      <div className="border-t border-stone2-100 pt-8 text-center">
        <p className="text-sm text-stone2-400 mb-4">
          Vous pratiquez souvent ? L&apos;abonnement peut être plus avantageux.
        </p>
        <Link href="/subscriptions" className="btn-secondary">
          Comparer avec les abonnements
        </Link>
      </div>

    </div>
  );
}
