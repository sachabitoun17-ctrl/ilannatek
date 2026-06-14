import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import {
  createPlanAction,
  deletePlanAction,
  togglePlanAction,
} from "./actions";
import DeleteForm from "@/components/DeleteForm";
import { AdminToast } from "@/components/AdminToast";
import { requireAdmin } from "@/lib/auth";

export default async function PlansPage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string };
}) {
  const user = await requireAdmin();
  const studioId = user.studioId ?? undefined;
  const plans = await db.plan.findMany({ where: { studioId }, orderBy: { priceCents: "asc" } });
  return (
    <div className="space-y-6">
      <AdminToast message={searchParams.success ?? searchParams.error ?? null} />
      <div>
        <p className="section-title">Administration</p>
        <h1 className="font-serif text-4xl font-medium text-brand-600 mt-1">Plans &amp; packs</h1>
      </div>
      <form
        action={createPlanAction}
        className="card grid gap-3 md:grid-cols-4"
      >
        <input name="name" placeholder="Nom" required className="input" />
        <select name="type" className="input" required>
          <option value="CREDIT_PACK">Pack de crédits</option>
          <option value="SUBSCRIPTION">Abonnement</option>
        </select>
        <input
          name="priceCents"
          type="number"
          min={0}
          required
          placeholder="Prix (centimes)"
          className="input"
        />
        <input
          name="creditsAmount"
          type="number"
          min={0}
          placeholder="Crédits (pack)"
          className="input"
        />
        <input
          name="intervalDays"
          type="number"
          min={1}
          placeholder="Durée (j) - abo"
          className="input"
        />
        <input
          name="creditsPerCycle"
          type="number"
          min={0}
          placeholder="Crédits/cycle - abo"
          className="input"
        />
        <input
          name="description"
          placeholder="Description"
          className="input md:col-span-2"
        />
        <button className="btn-primary md:col-span-4">Créer</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[10px] uppercase tracking-[0.18em] text-stone2-500 border-b border-stone2-100">
            <tr>
              <th className="pb-2">Nom</th>
              <th>Type</th>
              <th>Prix</th>
              <th className="hidden sm:table-cell">Crédits</th>
              <th className="hidden md:table-cell">Cycle</th>
              <th>Actif</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone2-100">
            {plans.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-stone2-400">
                  Aucun plan
                </td>
              </tr>
            )}
            {plans.map((p) => (
              <tr key={p.id}>
                <td className="py-2 font-medium">{p.name}</td>
                <td className="text-stone2-600">{p.type}</td>
                <td>{formatPrice(p.priceCents)}</td>
                <td className="hidden sm:table-cell text-stone2-600">
                  {p.creditsAmount ?? p.creditsPerCycle ?? "—"}
                </td>
                <td className="hidden md:table-cell text-stone2-600">
                  {p.intervalDays ? `${p.intervalDays}j` : "—"}
                </td>
                <td>{p.active ? "✓" : "✗"}</td>
                <td className="text-right py-2">
                  <div className="flex justify-end gap-2">
                    <form action={togglePlanAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="text-xs text-brand-600 hover:underline">
                        {p.active ? "Désactiver" : "Activer"}
                      </button>
                    </form>
                    <DeleteForm action={deletePlanAction} id={p.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
