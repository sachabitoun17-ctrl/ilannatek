import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import AssignSubClient from "./AssignSubClient";

export const dynamic = "force-dynamic";

export default async function AdminSubRequestsPage() {
  const user = await requireAdmin();
  const studioId = user.studioId ?? undefined;

  const [openRequests, instructors] = await Promise.all([
    db.subRequest.findMany({
      where: { status: "OPEN" },
      include: {
        session: {
          include: {
            classType: true,
            location: true,
            _count: { select: { bookings: { where: { status: "CONFIRMED" } } } },
          },
        },
        requester: { select: { firstName: true, lastName: true } },
      },
      orderBy: { session: { startTime: "asc" } },
    }),
    db.user.findMany({
      where: { studioId, role: { in: ["INSTRUCTOR", "ADMIN"] }, active: true },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
  ]);

  // Recent resolved requests (last 30 days)
  const resolved = await db.subRequest.findMany({
    where: {
      status: { in: ["ASSIGNED", "CANCELLED"] },
      updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    include: {
      session: { include: { classType: true, location: true } },
      requester: { select: { firstName: true, lastName: true } },
      sub: { select: { firstName: true, lastName: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-10">
      <div>
        <p className="section-title">Programmation</p>
        <h1 className="font-serif text-3xl font-medium text-brand-600 mt-1">Remplacements</h1>
      </div>

      {/* Open requests */}
      <section>
        <h2 className="font-serif text-xl text-brand-600 mb-4">
          Demandes ouvertes
          {openRequests.length > 0 && (
            <span className="ml-2 text-sm font-sans font-normal bg-accent-100 text-accent-700 px-2 py-0.5 rounded-sm">
              {openRequests.length}
            </span>
          )}
        </h2>

        {openRequests.length === 0 ? (
          <p className="text-stone2-500 text-sm border border-stone2-200 p-8 text-center">
            Aucune demande de remplacement en attente.
          </p>
        ) : (
          <div className="divide-y divide-stone2-100 border border-stone2-200">
            {openRequests.map((req) => (
              <div key={req.id} className="p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-brand-600">{req.session.classType.name}</p>
                    <p className="text-sm text-stone2-500 mt-0.5">
                      {req.session.startTime.toLocaleDateString("fr-FR", {
                        weekday: "long", day: "numeric", month: "long", year: "numeric",
                      })}
                      {" · "}
                      {req.session.startTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      {" · "}
                      {req.session.location.name}
                    </p>
                    <p className="text-sm text-stone2-500 mt-1">
                      <span className="text-stone2-400">Instructeur absent :</span>{" "}
                      <strong className="text-brand-600">{req.requester.firstName} {req.requester.lastName}</strong>
                      {" · "}
                      {req.session._count.bookings} inscrit{req.session._count.bookings !== 1 ? "s" : ""}
                    </p>
                    {req.reason && (
                      <p className="text-sm text-stone2-500 mt-1 italic">
                        &ldquo;{req.reason}&rdquo;
                      </p>
                    )}
                  </div>
                  <AssignSubClient
                    sessionId={req.sessionId}
                    instructors={instructors.filter((i) => i.id !== req.requesterId)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Resolved requests */}
      {resolved.length > 0 && (
        <section>
          <h2 className="font-serif text-xl text-brand-600 mb-4">Historique (30 derniers jours)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-stone2-200">
              <thead>
                <tr className="bg-stone2-50 border-b border-stone2-200">
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-stone2-500 font-medium">Séance</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-stone2-500 font-medium">Absent</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-stone2-500 font-medium">Remplaçant</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-stone2-500 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone2-100">
                {resolved.map((req) => (
                  <tr key={req.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand-600">{req.session.classType.name}</p>
                      <p className="text-stone2-400 text-xs">
                        {req.session.startTime.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        {" · "}
                        {req.session.startTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        {" · "}
                        {req.session.location.name}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-stone2-600">
                      {req.requester.firstName} {req.requester.lastName}
                    </td>
                    <td className="px-4 py-3 text-stone2-600">
                      {req.sub ? `${req.sub.firstName} ${req.sub.lastName}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 ${
                        req.status === "ASSIGNED"
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-stone2-100 text-stone2-500 border border-stone2-200"
                      }`}>
                        {req.status === "ASSIGNED" ? "Assigné" : "Annulé"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
