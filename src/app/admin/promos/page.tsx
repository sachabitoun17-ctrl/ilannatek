import { db } from "@/lib/db";
import { createPromoAction, togglePromoAction, deletePromoAction } from "./actions";
import DeleteForm from "@/components/DeleteForm";
import { formatPrice } from "@/lib/utils";
import { AdminToast } from "@/components/AdminToast";

export default async function PromosPage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string };
}) {
  const codes = await db.promoCode.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="space-y-6">
      <AdminToast message={searchParams.success ?? searchParams.error ?? null} />
      <h1 className="text-2xl font-bold">Codes promo</h1>
      <form action={createPromoAction} className="card grid gap-3 md:grid-cols-4">
        <input name="code" placeholder="CODE" required className="input uppercase" />
        <select name="discountType" required className="input">
          <option value="PERCENT">% de réduction</option>
          <option value="FIXED_CENTS">Montant fixe (cts)</option>
          <option value="FREE_CREDITS">Crédits offerts</option>
        </select>
        <input
          name="discountValue"
          type="number"
          required
          min={1}
          placeholder="Valeur"
          className="input"
        />
        <input
          name="maxUses"
          type="number"
          min={1}
          placeholder="Max utilisations"
          className="input"
        />
        <input
          name="expiresAt"
          type="date"
          placeholder="Expiration"
          className="input"
        />
        <input
          name="description"
          placeholder="Description"
          className="input md:col-span-2"
        />
        <button className="btn-primary">Créer</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="py-2">Code</th>
              <th>Type</th>
              <th>Valeur</th>
              <th>Utilisations</th>
              <th>Expire</th>
              <th>Actif</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {codes.map((p) => (
              <tr key={p.id}>
                <td className="py-2 font-mono">{p.code}</td>
                <td>{p.discountType}</td>
                <td>
                  {p.discountType === "PERCENT"
                    ? `${p.discountValue}%`
                    : p.discountType === "FIXED_CENTS"
                    ? formatPrice(p.discountValue)
                    : `${p.discountValue} crédits`}
                </td>
                <td>
                  {p.uses}
                  {p.maxUses ? `/${p.maxUses}` : ""}
                </td>
                <td className="text-gray-500">
                  {p.expiresAt ? p.expiresAt.toLocaleDateString("fr-FR") : "—"}
                </td>
                <td>{p.active ? "✓" : "✗"}</td>
                <td className="text-right flex justify-end gap-2 py-2">
                  <form action={togglePromoAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="text-xs text-brand-600 hover:underline">
                      {p.active ? "Désactiver" : "Activer"}
                    </button>
                  </form>
                  <DeleteForm action={deletePromoAction} id={p.id} />
                </td>
              </tr>
            ))}
            {codes.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-6 text-gray-400">
                  Aucun code
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
