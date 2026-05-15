import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: { action?: string; actor?: string };
}) {
  const logs = await db.auditLog.findMany({
    where: {
      ...(searchParams.action ? { action: searchParams.action } : {}),
      ...(searchParams.actor ? { actorId: searchParams.actor } : {}),
    },
    include: {
      actor: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Journal d&apos;audit</h1>
        <form className="flex gap-2">
          <input
            name="action"
            defaultValue={searchParams.action}
            placeholder="Action"
            className="input"
          />
          <button className="btn-secondary">Filtrer</button>
        </form>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="py-2">Quand</th>
              <th>Qui</th>
              <th>Action</th>
              <th>Cible</th>
              <th>IP</th>
              <th>Détails</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="py-2 text-gray-600 whitespace-nowrap">
                  {formatDateTime(l.createdAt)}
                </td>
                <td>
                  {l.actor ? (
                    <>
                      <div>
                        {l.actor.firstName} {l.actor.lastName}
                      </div>
                      <div className="text-xs text-gray-500">{l.actor.email}</div>
                    </>
                  ) : (
                    <span className="text-gray-400">système</span>
                  )}
                </td>
                <td>
                  <span className="badge bg-gray-100">{l.action}</span>
                </td>
                <td className="text-xs text-gray-500">
                  {l.entity ? `${l.entity}:${l.entityId}` : "—"}
                </td>
                <td className="text-xs text-gray-400">{l.ip ?? "—"}</td>
                <td className="text-xs text-gray-500 max-w-[260px] truncate">
                  {l.metadata ?? ""}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-6 text-gray-400">
                  Aucun événement
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
