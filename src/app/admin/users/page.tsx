import Link from "next/link";
import { db } from "@/lib/db";
import { adjustCreditsAction } from "./actions";
import RoleSelect from "./RoleSelect";

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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-title">Administration</p>
          <h1 className="font-serif text-4xl font-medium text-brand-600 mt-1">Membres</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a href="/api/export/members" className="btn-secondary text-sm">
            Export CSV
          </a>
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
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[10px] uppercase tracking-[0.18em] text-stone2-500 border-b border-stone2-100">
            <tr>
              <th className="pb-2">Nom</th>
              <th className="hidden sm:table-cell">Email</th>
              <th>Crédits</th>
              <th className="hidden md:table-cell">Rôle</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone2-100">
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-stone2-400">
                  Aucun membre trouvé
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id}>
                <td className="py-2 font-medium">
                  <Link href={`/admin/users/${u.id}`} className="hover:text-accent-600 hover:underline">
                    {u.firstName} {u.lastName}
                  </Link>
                </td>
                <td className="hidden sm:table-cell text-stone2-600">{u.email}</td>
                <td>{u.creditsBalance}</td>
                <td className="hidden md:table-cell">
                  <RoleSelect userId={u.id} currentRole={u.role} />
                </td>
                <td className="text-right">
                  <form
                    action={adjustCreditsAction}
                    className="flex items-center justify-end gap-1"
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
