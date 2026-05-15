import { db } from "@/lib/db";
import { createLocationAction, deleteLocationAction } from "./actions";
import DeleteForm from "@/components/DeleteForm";

export default async function LocationsPage() {
  const items = await db.location.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Studios</h1>
      <form
        action={createLocationAction}
        className="card grid gap-3 md:grid-cols-3"
      >
        <input name="name" placeholder="Nom" required className="input" />
        <input
          name="address"
          placeholder="Adresse"
          className="input md:col-span-2"
        />
        <button className="btn-primary md:col-span-3">Ajouter</button>
      </form>
      <div className="card">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="py-2">Nom</th>
              <th>Adresse</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((l) => (
              <tr key={l.id}>
                <td className="py-2 font-medium">{l.name}</td>
                <td className="text-gray-600">{l.address}</td>
                <td className="text-right">
                  <DeleteForm action={deleteLocationAction} id={l.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
