import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatPrice } from "@/lib/utils";
import PurchaseButton from "../packs/PurchaseButton";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Abonnements</h1>
        <p className="text-sm text-gray-500">
          Profitez d&apos;un nombre de crédits récurrent à tarif préférentiel
        </p>
      </div>

      {activeSub && (
        <div className="card bg-green-50 border-green-200">
          <p className="text-sm font-medium text-green-900">
            Abonnement actif : {activeSub.plan.name}
          </p>
          <p className="text-xs text-green-700 mt-1">
            Valide jusqu&apos;au {activeSub.endDate.toLocaleDateString("fr-FR")}
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {plans.map((p) => {
          const months = (p.intervalDays ?? 30) / 30;
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
                  / {months >= 1 ? `${months} mois` : `${p.intervalDays}j`}
                </span>
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• {p.creditsPerCycle} crédits dès l&apos;activation</li>
                <li>• Reconductible automatiquement</li>
                <li>• Annulable à tout moment</li>
              </ul>
              {user ? (
                <PurchaseButton planId={p.id} cta="S'abonner" />
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
