import { db } from "@/lib/db";
import { adjustCreditsAction, setRoleAction } from "./actions";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q?.trim();
  const users = await db.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q } },
            { firstName: { contains: q } },
            { lastName: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Membres</h1>
        <form className="flex items-center gap-2">
          <input
            name="q"
            placeholder="Rechercher..."
            defaultValue={q}
            className="input"
          />
          <button className="btn-secondary">Rechercher</button>
        </form>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="py-2">Nom</th>
              <th>Email</th>
              <th>Crédits</th>
              <th>Rôle</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="py-2">
                  {u.firstName} {u.lastName}
                </td>
                <td>{u.email}</td>
                <td>{u.creditsBalance}</td>
                <td>{u.role}</td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <form
                      action={adjustCreditsAction}
                      className="flex items-center gap-1"
                    >
                      <input type="hidden" name="id" value={u.id} />
                      <input
                        type="number"
                        name="delta"
                        placeholder="±"
                        className="input w-20 py-1 text-xs"
                      />
                      <button className="text-xs text-brand-600 hover:underline">
                        Ajuster
                      </button>
                    </form>
                    <form action={setRoleAction}>
                      <input type="hidden" name="id" value={u.id} />
                      <select
                        name="role"
                        defaultValue={u.role}
                        className="input py-1 text-xs"
                      >
                        <option value="USER">USER</option>
                        <option value="INSTRUCTOR">INSTRUCTOR</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                      <button className="text-xs text-brand-600 hover:underline ml-1">
                        OK
                      </button>
                    </form>
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
