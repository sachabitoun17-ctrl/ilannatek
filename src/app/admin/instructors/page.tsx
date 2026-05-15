import { db } from "@/lib/db";
import { createInstructorAction, toggleInstructorRoleAction } from "./actions";
import { AdminToast } from "@/components/AdminToast";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  INSTRUCTOR: "Instructeur",
  MEMBER: "Membre",
};

export default async function InstructorsPage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string };
}) {
  const instructors = await db.user.findMany({
    where: { role: { in: ["INSTRUCTOR", "ADMIN"] } },
    orderBy: { firstName: "asc" },
  });
  return (
    <div className="space-y-6">
      <AdminToast message={searchParams.success ?? searchParams.error ?? null} />
      <div>
        <p className="section-title">Administration</p>
        <h1 className="font-serif text-4xl font-medium text-brand-600 mt-1">Instructeurs</h1>
      </div>
      <form
        action={createInstructorAction}
        className="card grid gap-3 md:grid-cols-3"
      >
        <input name="firstName" placeholder="Prénom" required className="input" />
        <input name="lastName" placeholder="Nom" required className="input" />
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="input"
        />
        <input
          name="password"
          placeholder="Mot de passe initial"
          required
          minLength={8}
          className="input md:col-span-2"
        />
        <button className="btn-primary">Créer instructeur</button>
        <textarea
          name="bio"
          placeholder="Bio"
          className="input md:col-span-3"
        />
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[10px] uppercase tracking-[0.18em] text-stone2-500 border-b border-stone2-100">
            <tr>
              <th className="pb-2">Nom</th>
              <th className="hidden sm:table-cell">Email</th>
              <th>Rôle</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone2-100">
            {instructors.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm text-stone2-400">
                  Aucun instructeur
                </td>
              </tr>
            )}
            {instructors.map((i) => (
              <tr key={i.id}>
                <td className="py-2 font-medium">
                  {i.firstName} {i.lastName}
                </td>
                <td className="hidden sm:table-cell text-stone2-600">{i.email}</td>
                <td>
                  <span className="badge bg-stone2-100 text-stone2-700">
                    {ROLE_LABELS[i.role] ?? i.role}
                  </span>
                </td>
                <td className="text-right">
                  <form action={toggleInstructorRoleAction}>
                    <input type="hidden" name="id" value={i.id} />
                    <button className="text-xs text-brand-600 hover:underline">
                      Basculer rôle
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
