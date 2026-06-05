export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatPrice } from "@/lib/utils";
import PurchaseButton from "../packs/PurchaseButton";

function formatInterval(intervalDays: number | null): string {
  const days = intervalDays ?? 30;
  const months = Math.round(days / 30);
  if (months >= 11) return "an";
  if (months > 1) return `${months} mois`;
  return "mois";
}

export default async function SubscriptionsPage() {
  const user = await getCurrentUser();
  const plans = await db.plan.findMany({
    where: { type: "SUBSCRIPTION", active: true },
    orderBy: { priceCents: "asc" },
  });

  const activeSub = user
    ? await db.subscription.findFirst({
        where: {
          userId: user.id,
          status: "ACTIVE",
          endDate: { gt: new Date() },
        },
        include: { plan: true },
        orderBy: { endDate: "desc" },
      })
    : null;

  const maxPrice = plans.length > 0 ? Math.max(...plans.map((p) => p.priceCents)) : 0;

  return (
    <div className="space-y-12">

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-stone2-100">
        <div>
          <p className="section-title mb-3">Studio Boutique</p>
          <h1 className="font-serif text-4xl md:text-5xl font-medium text-brand-600 leading-tight">
            Abonnements
          </h1>
          <p className="text-sm text-stone2-500 mt-2">
            Crédits renouvelés automatiquement · Sans engagement · Annulable à tout moment.
          </p>
        </div>
        <Link href="/packs" className="text-[11px] uppercase tracking-[0.2em] text-stone2-500 hover:text-brand-600 transition-colors border-b border-stone2-300 pb-1">
          Voir les packs de crédits
        </Link>
      </div>

      {activeSub && (
        <div className="bg-brand-600 text-cream-50 px-6 py-5 flex items-start gap-4">
          <div className="w-1 h-full bg-accent-400 shrink-0 self-stretch" />
          <div>
            <p className="font-semibold text-sm mb-1">Abonnement actif : {activeSub.plan.name}</p>
            <p className="text-xs text-stone2-300">
              Valide jusqu'au {activeSub.endDate.toLocaleDateString("fr-FR")} · Gérez votre abonnement depuis Mon compte.
            </p>
          </div>
        </div>
      )}

      {!user && (
        <div className="bg-cream-100 border border-stone2-200 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-brand-600">
            Connectez-vous pour souscrire à un abonnement.
          </p>
          <Link href="/login" className="btn-primary text-xs py-2">
            Se connecter
          </Link>
        </div>
      )}

      {/* Plans */}
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
        {plans.map((p) => {
          const isFeatured = p.priceCents === maxPrice;
          const pricePerCredit = p.creditsPerCycle
            ? formatPrice(Math.round(p.priceCents / p.creditsPerCycle))
            : null;
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
                    {p.creditsPerCycle} crédits / {formatInterval(p.intervalDays)}
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
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`font-serif font-medium leading-none ${isFeatured ? "text-cream-50" : "text-brand-600"}`}
                      style={{ fontSize: "clamp(2rem, 5vw, 2.75rem)" }}
                    >
                      {formatPrice(p.priceCents)}
                    </span>
                    <span className={`text-sm ${isFeatured ? "text-stone2-400" : "text-stone2-500"}`}>
                      / {formatInterval(p.intervalDays)}
                    </span>
                  </div>
                  {pricePerCredit && (
                    <p className={`text-xs mt-2 ${isFeatured ? "text-stone2-400" : "text-stone2-400"}`}>
                      Soit {pricePerCredit} par crédit
                    </p>
                  )}
                </div>

                <ul className={`text-sm space-y-1.5 ${isFeatured ? "text-stone2-300" : "text-stone2-600"}`}>
                  <li>· {p.creditsPerCycle} crédits dès l&apos;activation</li>
                  <li>· Renouvellement automatique</li>
                  <li>· Annulable à tout moment</li>
                </ul>

                {user ? (
                  <div className={isFeatured
                    ? "[&_.btn-primary]:bg-cream-50 [&_.btn-primary]:text-brand-600 [&_.btn-primary]:hover:bg-accent-200"
                    : ""
                  }>
                    <PurchaseButton planId={p.id} cta="S'abonner" />
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
                    Se connecter pour s&apos;abonner
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust signals */}
      <div className="border-t border-stone2-100 pt-8 space-y-4">
        <div className="flex flex-wrap gap-6 justify-center text-xs text-stone2-400 uppercase tracking-widest">
          <span>Sans engagement</span>
          <span>·</span>
          <span>Paiement sécurisé Stripe</span>
          <span>·</span>
          <span>Résiliation en un clic</span>
          <span>·</span>
          <span>Crédits jamais perdus</span>
        </div>
        <p className="text-center text-sm text-stone2-400">
          Vous préférez plus de flexibilité ?{" "}
          <Link href="/packs" className="text-brand-600 underline hover:text-accent-600 transition-colors">
            Découvrez les packs de crédits
          </Link>
        </p>
      </div>

    </div>
  );
}
