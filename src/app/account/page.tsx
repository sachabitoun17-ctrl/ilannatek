import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatDateTime, formatPrice } from "@/lib/utils";
import { cancelAction } from "../schedule/actions";
import CancelButton from "./CancelButton";

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
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">
            Bonjour {user.firstName} 👋
          </h1>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="card flex flex-col items-center min-w-[160px]">
            <span className="text-xs text-gray-500">Solde crédits</span>
            <span className="text-3xl font-bold text-brand-600">
              {user.creditsBalance}
            </span>
          </div>
          <Link href="/packs" className="btn-primary">
            + Acheter
          </Link>
        </div>
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-3">Mes prochaines réservations</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            Aucune réservation à venir.{" "}
            <Link href="/schedule" className="text-brand-600 underline">
              Découvrir le planning
            </Link>
          </p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((b) => (
              <div
                key={b.id}
                className="card flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="font-medium">{b.session.classType.name}</p>
                  <p className="text-sm text-gray-600">
                    {formatDateTime(b.session.startTime)} · {b.session.location.name}
                  </p>
                  <p className="text-xs text-gray-500">
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
        <h2 className="text-xl font-semibold mb-3">Mes abonnements</h2>
        {subs.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Aucun abonnement.</p>
        ) : (
          <div className="space-y-2">
            {subs.map((s) => (
              <div
                key={s.id}
                className="card flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{s.plan.name}</p>
                  <p className="text-xs text-gray-500">
                    Du {s.startDate.toLocaleDateString("fr-FR")} au{" "}
                    {s.endDate.toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <span
                  className={`badge ${
                    s.status === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Historique</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 text-xs uppercase">
              <tr>
                <th className="py-2">Date</th>
                <th>Type</th>
                <th>Description</th>
                <th className="text-right">Crédits</th>
                <th className="text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-400">
                    Aucune transaction
                  </td>
                </tr>
              )}
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td className="py-2 text-gray-600">
                    {t.createdAt.toLocaleDateString("fr-FR")}
                  </td>
                  <td>{t.type}</td>
                  <td className="text-gray-600">{t.description}</td>
                  <td
                    className={`text-right ${
                      t.creditsDelta > 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {t.creditsDelta > 0 ? `+${t.creditsDelta}` : t.creditsDelta}
                  </td>
                  <td className="text-right">
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
