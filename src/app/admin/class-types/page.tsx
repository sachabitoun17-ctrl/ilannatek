import { db } from "@/lib/db";
import { createClassTypeAction, deleteClassTypeAction } from "./actions";
import DeleteForm from "@/components/DeleteForm";
import { AdminToast } from "@/components/AdminToast";

export default async function ClassTypesPage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string };
}) {
  const items = await db.classType.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="space-y-6">
      <AdminToast message={searchParams.success ?? searchParams.error ?? null} />
      <h1 className="text-2xl font-bold">Types de cours</h1>
      <form action={createClassTypeAction} className="card grid gap-3 md:grid-cols-5">
        <input name="name" placeholder="Nom" required className="input" />
        <input
          name="durationMin"
          type="number"
          min={5}
          defaultValue={60}
          placeholder="Durée (min)"
          className="input"
        />
        <input
          name="creditCost"
          type="number"
          min={0}
          defaultValue={1}
          placeholder="Coût"
          className="input"
        />
        <input
          name="color"
          type="color"
          defaultValue="#ec4899"
          className="input p-1 h-10"
        />
        <button className="btn-primary">Ajouter</button>
        <textarea
          name="description"
          placeholder="Description"
          className="input md:col-span-5"
        />
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="py-2">Nom</th>
              <th>Durée</th>
              <th>Coût</th>
              <th>Couleur</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-gray-400">
                  Aucun type de cours
                </td>
              </tr>
            )}
            {items.map((c) => (
              <tr key={c.id}>
                <td className="py-2 font-medium">{c.name}</td>
                <td>{c.durationMin} min</td>
                <td>{c.creditCost}</td>
                <td>
                  <span
                    className="inline-block w-5 h-5 rounded"
                    style={{ background: c.color }}
                  />
                </td>
                <td className="text-right">
                  <DeleteForm action={deleteClassTypeAction} id={c.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
