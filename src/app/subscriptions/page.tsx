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

  // Mark the most expensive plan as featured
  const maxPrice = plans.length > 0 ? Math.max(...plans.map((p) => p.priceCents)) : 0;

  return (
    <div className="space-y-10">
      <div>
        <p className="section-title">Studio Boutique</p>
        <h1 className="text-3xl font-bold text-gray-900">Abonnements</h1>
        <p className="text-sm text-gray-500 mt-1">
          Profitez d&apos;un nombre de crédits récurrent à tarif préférentiel
        </p>
      </div>

      {activeSub && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm font-medium text-green-900">
            Abonnement actif : {activeSub.plan.name}
          </p>
          <p className="text-xs text-green-700 mt-1">
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
              className={`rounded-xl border flex flex-col gap-5 p-7 ${
                isFeatured
                  ? "bg-brand-600 border-brand-600 text-white"
                  : "bg-white border-gray-100"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3
                  className={`text-base font-semibold ${
                    isFeatured ? "text-white" : "text-gray-900"
                  }`}
                >
                  {p.name}
                </h3>
                {isFeatured && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white">
                    Populaire
                  </span>
                )}
              </div>

              {p.description && (
                <p
                  className={`text-sm ${
                    isFeatured ? "text-brand-100" : "text-gray-600"
                  }`}
                >
                  {p.description}
                </p>
              )}

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
                  / {formatInterval(p.intervalDays)}
                </span>
              </div>

              <ul
                className={`text-sm space-y-1.5 flex-1 ${
                  isFeatured ? "text-brand-100" : "text-gray-600"
                }`}
              >
                <li>· {p.creditsPerCycle} crédits dès l&apos;activation</li>
                <li>· Reconductible automatiquement</li>
                <li>· Annulable à tout moment</li>
              </ul>

              {user ? (
                <div className={isFeatured ? "[&_.btn-primary]:bg-white [&_.btn-primary]:text-brand-700 [&_.btn-primary]:hover:bg-brand-50" : ""}>
                  <PurchaseButton planId={p.id} cta="S'abonner" />
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
