import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatPrice } from "@/lib/utils";
import PurchaseButton from "../packs/PurchaseButton";

function formatInterval(intervalDays: number | null): string {
  const days = intervalDays ?? 30;
  const months = Math.round(days / 30);
  if (months >= 11) return "1 an";
  if (months > 1) return `${months} mois`;
  return "1 mois";
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
    <div className="space-y-10">
      <div>
        <p className="section-title">Studio Boutique</p>
        <h1 className="font-serif text-4xl md:text-5xl font-medium text-brand-600 mt-1">
          Abonnements
        </h1>
        <p className="text-sm text-stone2-500 mt-2">
          Profitez d&apos;un nombre de crédits récurrent à tarif préférentiel
        </p>
      </div>

      {activeSub && (
        <div className="border border-accent-200 bg-accent-50 px-5 py-4">
          <p className="text-sm font-medium text-brand-600">
            Abonnement actif : {activeSub.plan.name}
          </p>
          <p className="text-xs text-stone2-600 mt-1">
            Valide jusqu&apos;au {activeSub.endDate.toLocaleDateString("fr-FR")}
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-5">
        {plans.map((p) => {
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
                  / {formatInterval(p.intervalDays)}
                </span>
              </div>

              <ul
                className={`text-sm space-y-1.5 flex-1 ${
                  isFeatured ? "text-stone2-300" : "text-stone2-600"
                }`}
              >
                <li>· {p.creditsPerCycle} crédits dès l&apos;activation</li>
                <li>· Reconductible automatiquement</li>
                <li>· Annulable à tout moment</li>
              </ul>

              {user ? (
                <div
                  className={
                    isFeatured
                      ? "[&_.btn-primary]:bg-cream-50 [&_.btn-primary]:text-brand-600 [&_.btn-primary]:hover:bg-accent-200"
                      : ""
                  }
                >
                  <PurchaseButton planId={p.id} cta="S'abonner" />
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
