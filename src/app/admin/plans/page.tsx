import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import {
  createPlanAction,
  deletePlanAction,
  togglePlanAction,
} from "./actions";
import DeleteForm from "@/components/DeleteForm";

export default async function PlansPage() {
  const plans = await db.plan.findMany({ orderBy: { priceCents: "asc" } });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Plans & packs</h1>
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
          <thead className="text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="py-2">Nom</th>
              <th>Type</th>
              <th>Prix</th>
              <th>Crédits</th>
              <th>Cycle</th>
              <th>Actif</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {plans.map((p) => (
              <tr key={p.id}>
                <td className="py-2 font-medium">{p.name}</td>
                <td>{p.type}</td>
                <td>{formatPrice(p.priceCents)}</td>
                <td>{p.creditsAmount ?? p.creditsPerCycle ?? "—"}</td>
                <td>{p.intervalDays ? `${p.intervalDays}j` : "—"}</td>
                <td>{p.active ? "✓" : "✗"}</td>
                <td className="text-right flex justify-end gap-2 py-2">
                  <form action={togglePlanAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="text-xs text-brand-600 hover:underline">
                      {p.active ? "Désactiver" : "Activer"}
                    </button>
                  </form>
                  <DeleteForm action={deletePlanAction} id={p.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
