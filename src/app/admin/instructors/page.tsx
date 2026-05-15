import { db } from "@/lib/db";
import { createInstructorAction, toggleInstructorRoleAction } from "./actions";

export default async function InstructorsPage() {
  const instructors = await db.user.findMany({
    where: { role: { in: ["INSTRUCTOR", "ADMIN"] } },
    orderBy: { firstName: "asc" },
  });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Instructeurs</h1>
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
          <thead className="text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="py-2">Nom</th>
              <th>Email</th>
              <th>Rôle</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {instructors.map((i) => (
              <tr key={i.id}>
                <td className="py-2 font-medium">
                  {i.firstName} {i.lastName}
                </td>
                <td>{i.email}</td>
                <td>
                  <span className="badge bg-gray-100">{i.role}</span>
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
