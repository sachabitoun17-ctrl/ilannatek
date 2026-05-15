import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatDateTime, formatPrice } from "@/lib/utils";
import { cancelAction } from "../schedule/actions";
import CancelButton from "./CancelButton";
import { FreezeButton, UnfreezeButton } from "./SubscriptionActions";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [bookings, subs, transactions] = await Promise.all([
    db.booking.findMany({
      where: { userId: user.id, status: { in: ["CONFIRMED", "WAITLIST"] } },
      include: {
        session: {
          include: {
            classType: true,
            instructor: { select: { firstName: true, lastName: true } },
            location: true,
          },
        },
      },
      orderBy: { session: { startTime: "asc" } },
    }),
    db.subscription.findMany({
      where: { userId: user.id },
      include: { plan: true },
      orderBy: { startDate: "desc" },
      take: 10,
    }),
    db.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const upcoming = bookings.filter((b) => b.session.startTime >= new Date());

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div>
          <p className="section-title">Mon espace</p>
          <h1 className="text-3xl font-bold text-gray-900 mt-1">
            Bonjour, {user.firstName}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-gray-100 bg-white p-5 text-center min-w-[140px]">
            <p className="section-title mb-0">Crédits</p>
            <p className="text-4xl font-bold text-brand-600 mt-1">
              {user.creditsBalance}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/packs" className="btn-primary text-sm">
              + Acheter
            </Link>
            <Link href="/account/profile" className="btn-secondary text-sm">
              Mon profil
            </Link>
          </div>
        </div>
      </div>

      <section>
        <p className="section-title">Prochaines réservations</p>
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-500 mt-3">
            Aucune réservation à venir.{" "}
            <Link href="/schedule" className="text-brand-600 underline hover:text-brand-700">
              Voir le planning
            </Link>
          </p>
        ) : (
          <div className="space-y-2 mt-3">
            {upcoming.map((b) => (
              <div
                key={b.id}
                className="card flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="font-semibold text-gray-900">{b.session.classType.name}</p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {formatDateTime(b.session.startTime)} · {b.session.location.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Avec {b.session.instructor.firstName}{" "}
                    {b.session.instructor.lastName}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`badge ${
                      b.status === "CONFIRMED"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {b.status === "CONFIRMED"
                      ? "Confirmée"
                      : `Liste d'attente · #${b.waitlistPos}`}
                  </span>
                  <CancelButton bookingId={b.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="section-title">Mes abonnements</p>
        {subs.length === 0 ? (
          <p className="text-sm text-gray-500 mt-3">
            Aucun abonnement.{" "}
            <Link href="/subscriptions" className="text-brand-600 underline hover:text-brand-700">
              Voir les offres
            </Link>
          </p>
        ) : (
          <div className="space-y-2 mt-3">
            {subs.map((s) => (
              <div
                key={s.id}
                className="card flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="font-semibold text-gray-900">{s.plan.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Du {s.startDate.toLocaleDateString("fr-FR")} au{" "}
                    {s.endDate.toLocaleDateString("fr-FR")}
                  </p>
                  {s.frozenAt && (
                    <p className="text-xs text-amber-600 mt-0.5">
                      En pause depuis le {s.frozenAt.toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`badge ${
                      s.status === "ACTIVE"
                        ? "bg-green-100 text-green-700"
                        : s.status === "FROZEN"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {s.status === "ACTIVE" ? "Actif" : s.status === "FROZEN" ? "En pause" : s.status}
                  </span>
                  {s.status === "ACTIVE" && <FreezeButton subscriptionId={s.id} />}
                  {s.status === "FROZEN" && <UnfreezeButton subscriptionId={s.id} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="section-title">Historique</p>
        <div className="card overflow-x-auto mt-3">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="pb-3">Date</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Description</th>
                <th className="pb-3 text-right">Crédits</th>
                <th className="pb-3 text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-400">
                    Aucune transaction
                  </td>
                </tr>
              )}
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50/50">
                  <td className="py-3 text-gray-500">
                    {t.createdAt.toLocaleDateString("fr-FR")}
                  </td>
                  <td className="py-3 text-gray-700">{t.type}</td>
                  <td className="py-3 text-gray-500">{t.description}</td>
                  <td
                    className={`py-3 text-right font-medium ${
                      t.creditsDelta > 0 ? "text-green-600" : "text-gray-700"
                    }`}
                  >
                    {t.creditsDelta > 0 ? `+${t.creditsDelta}` : t.creditsDelta || "—"}
                  </td>
                  <td className="py-3 text-right text-gray-700">
                    {t.amountCents > 0 ? formatPrice(t.amountCents) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
