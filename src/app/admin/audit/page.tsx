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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-title">Administration</p>
          <h1 className="font-serif text-4xl font-medium text-brand-600 mt-1">Journal d&apos;audit</h1>
        </div>
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
          <thead className="text-left text-[10px] uppercase tracking-[0.18em] text-stone2-500 border-b border-stone2-100">
            <tr>
              <th className="pb-2">Quand</th>
              <th>Qui</th>
              <th>Action</th>
              <th className="hidden md:table-cell">Cible</th>
              <th className="hidden lg:table-cell">IP</th>
              <th className="hidden lg:table-cell">Détails</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone2-100">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="py-2 text-stone2-600 whitespace-nowrap">
                  {formatDateTime(l.createdAt)}
                </td>
                <td>
                  {l.actor ? (
                    <>
                      <div className="font-medium">
                        {l.actor.firstName} {l.actor.lastName}
                      </div>
                      <div className="text-xs text-stone2-500">{l.actor.email}</div>
                    </>
                  ) : (
                    <span className="text-stone2-400">système</span>
                  )}
                </td>
                <td>
                  <span className="badge bg-stone2-100 text-stone2-700">{l.action}</span>
                </td>
                <td className="hidden md:table-cell text-xs text-stone2-500">
                  {l.entity ? `${l.entity}:${l.entityId}` : "—"}
                </td>
                <td className="hidden lg:table-cell text-xs text-stone2-400">{l.ip ?? "—"}</td>
                <td className="hidden lg:table-cell text-xs text-stone2-500 max-w-[260px] truncate">
                  {l.metadata ?? ""}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-6 text-stone2-400">
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
