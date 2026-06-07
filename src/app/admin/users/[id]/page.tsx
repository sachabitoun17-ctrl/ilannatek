import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDateShort, formatPrice, relativeTime } from "@/lib/utils";
import {
  adminAdjustCreditsAction,
  adminBanUserAction,
  adminFreezeCreditsAction,
  adminCancelSubscriptionAction,
  adminSetRoleAction,
  adminRefundBookingAction,
} from "./actions";

const BOOKING_STATUS: Record<string, { label: string; cls: string }> = {
  CONFIRMED: { label: "Confirmé", cls: "bg-stone2-100 text-stone2-700" },
  WAITLIST:  { label: "Attente",  cls: "bg-accent-100 text-accent-700" },
  CANCELLED: { label: "Annulé",   cls: "bg-stone2-50 text-stone2-400" },
  ATTENDED:  { label: "Présent",  cls: "bg-green-50 text-green-700" },
  NO_SHOW:   { label: "Absent",   cls: "bg-red-50 text-red-700" },
};

const TX_LABEL: Record<string, string> = {
  PURCHASE_PACK: "Achat pack",
  PURCHASE_SUBSCRIPTION: "Abonnement",
  BOOKING: "Réservation",
  REFUND: "Remboursement",
  ADMIN_ADJUST: "Ajustement admin",
  REFERRAL_BONUS: "Bonus parrainage",
};

export default async function AdminUserDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await db.user.findUnique({
    where: { id: params.id },
    include: {
      subscriptions: {
        include: { plan: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      bookings: {
        include: {
          session: {
            include: { classType: true, location: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      },
      transactions: {
        include: { plan: true },
        orderBy: { createdAt: "desc" },
        take: 30,
      },
    },
  });

  if (!user) notFound();

  const totalAttended = user.bookings.filter((b) => b.status === "ATTENDED").length;
  const totalSpent = user.transactions
    .filter((t) => t.amountCents > 0)
    .reduce((s, t) => s + t.amountCents, 0);

  const activeSubs = user.subscriptions.filter((s) => s.status === "ACTIVE");
  const isFrozen = user.creditsFrozenUntil && user.creditsFrozenUntil > new Date();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/admin/users" className="text-sm text-stone2-500 hover:text-brand-600 flex items-center gap-1 mb-4">
          ← Retour aux membres
        </Link>
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1">
            <p className="section-title">Administration · Membres</p>
            <h1 className="font-serif text-4xl font-medium text-brand-600 mt-1">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-stone2-500 mt-1">{user.email}</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {!user.active && (
              <span className="badge bg-stone2-100 text-stone2-500">Compte supprimé</span>
            )}
            {user.banned && (
              <span className="badge bg-red-100 text-red-700 font-medium">Banni</span>
            )}
            {isFrozen && (
              <span className="badge bg-blue-50 text-blue-700">Crédits gelés</span>
            )}
            <span className="badge bg-stone2-100 text-stone2-700">{user.role}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-serif font-medium text-brand-600">{user.creditsBalance}</p>
          <p className="text-xs uppercase tracking-widest text-stone2-500 mt-1">Crédits</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-serif font-medium text-brand-600">{totalAttended}</p>
          <p className="text-xs uppercase tracking-widest text-stone2-500 mt-1">Cours suivis</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-serif font-medium text-brand-600">{activeSubs.length}</p>
          <p className="text-xs uppercase tracking-widest text-stone2-500 mt-1">Abonnements actifs</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-serif font-medium text-brand-600">{formatPrice(totalSpent)}</p>
          <p className="text-xs uppercase tracking-widest text-stone2-500 mt-1">Total dépensé</p>
        </div>
      </div>

      {/* Profile + Actions row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile info */}
        <div className="card space-y-4">
          <h2 className="font-serif text-xl font-medium text-brand-600">Profil</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone2-500">ID</dt>
              <dd className="font-mono text-xs text-stone2-600">{user.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone2-500">Téléphone</dt>
              <dd>{user.phone ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone2-500">Inscrit le</dt>
              <dd>{formatDateShort(user.createdAt)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone2-500">Email vérifié</dt>
              <dd>{user.emailVerifiedAt ? formatDateShort(user.emailVerifiedAt) : "Non"}</dd>
            </div>
            {user.stripeCustomerId && (
              <div className="flex justify-between">
                <dt className="text-stone2-500">Stripe</dt>
                <dd className="font-mono text-xs text-stone2-600">{user.stripeCustomerId}</dd>
              </div>
            )}
            {user.creditsFrozenUntil && (
              <div className="flex justify-between">
                <dt className="text-stone2-500">Crédits gelés jusqu&apos;au</dt>
                <dd>{formatDateShort(user.creditsFrozenUntil)}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Admin actions */}
        <div className="card space-y-5">
          <h2 className="font-serif text-xl font-medium text-brand-600">Actions</h2>

          {/* Adjust credits */}
          <form action={adminAdjustCreditsAction} className="space-y-2">
            <input type="hidden" name="userId" value={user.id} />
            <p className="text-xs uppercase tracking-widest text-stone2-500">Ajuster les crédits</p>
            <div className="flex gap-2">
              <input
                type="number"
                name="delta"
                placeholder="±5"
                className="input w-20 py-1.5 text-sm"
                required
              />
              <input
                type="text"
                name="note"
                placeholder="Motif (facultatif)"
                className="input flex-1 py-1.5 text-sm"
              />
              <button className="btn-secondary text-sm">Ajuster</button>
            </div>
          </form>

          <hr className="border-stone2-100" />

          {/* Ban / unban */}
          <form action={adminBanUserAction}>
            <input type="hidden" name="userId" value={user.id} />
            <input type="hidden" name="ban" value={user.banned ? "0" : "1"} />
            <p className="text-xs uppercase tracking-widest text-stone2-500 mb-2">Accès</p>
            <button
              className={user.banned ? "btn-secondary text-sm" : "text-sm text-red-600 border border-red-200 rounded px-3 py-1.5 hover:bg-red-50 transition-colors"}
            >
              {user.banned ? "Lever le bannissement" : "Bannir ce membre"}
            </button>
          </form>

          <hr className="border-stone2-100" />

          {/* Freeze credits */}
          <form action={adminFreezeCreditsAction} className="space-y-2">
            <input type="hidden" name="userId" value={user.id} />
            <p className="text-xs uppercase tracking-widest text-stone2-500">Geler les crédits</p>
            {isFrozen ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-stone2-600">
                  Gelés jusqu&apos;au {formatDateShort(user.creditsFrozenUntil!)}
                </span>
                <button className="btn-secondary text-sm">Dégeler</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="date"
                  name="until"
                  min={new Date().toISOString().split("T")[0]}
                  className="input flex-1 py-1.5 text-sm"
                  required
                />
                <button className="btn-secondary text-sm">Geler</button>
              </div>
            )}
          </form>

          <hr className="border-stone2-100" />

          {/* Role */}
          <form action={adminSetRoleAction} className="space-y-2">
            <input type="hidden" name="userId" value={user.id} />
            <p className="text-xs uppercase tracking-widest text-stone2-500">Rôle</p>
            <div className="flex gap-2">
              <select name="role" defaultValue={user.role} className="input flex-1 py-1.5 text-sm">
                <option value="USER">USER</option>
                <option value="INSTRUCTOR">INSTRUCTOR</option>
                <option value="ADMIN">ADMIN</option>
              </select>
              <button className="btn-secondary text-sm">Modifier</button>
            </div>
          </form>
        </div>
      </div>

      {/* Subscriptions */}
      {user.subscriptions.length > 0 && (
        <div className="card space-y-4">
          <h2 className="font-serif text-xl font-medium text-brand-600">Abonnements</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[10px] uppercase tracking-[0.18em] text-stone2-500 border-b border-stone2-100">
                <tr>
                  <th className="pb-2">Formule</th>
                  <th>Statut</th>
                  <th>Début</th>
                  <th>Fin</th>
                  <th>Auto-renouvellement</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone2-100">
                {user.subscriptions.map((sub) => (
                  <tr key={sub.id}>
                    <td className="py-2 font-medium">{sub.plan.name}</td>
                    <td>
                      <span
                        className={`badge ${
                          sub.status === "ACTIVE"
                            ? "bg-green-50 text-green-700"
                            : sub.status === "FROZEN"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-stone2-100 text-stone2-500"
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="text-stone2-600">{formatDateShort(sub.startDate)}</td>
                    <td className="text-stone2-600">{formatDateShort(sub.endDate)}</td>
                    <td>{sub.autoRenew ? "Oui" : "Non"}</td>
                    <td>
                      {sub.status === "ACTIVE" && (
                        <form action={adminCancelSubscriptionAction}>
                          <input type="hidden" name="subscriptionId" value={sub.id} />
                          <button className="text-xs text-red-600 hover:underline">
                            Annuler
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bookings */}
      <div className="card space-y-4">
        <h2 className="font-serif text-xl font-medium text-brand-600">Réservations récentes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] uppercase tracking-[0.18em] text-stone2-500 border-b border-stone2-100">
              <tr>
                <th className="pb-2">Cours</th>
                <th>Date</th>
                <th className="hidden md:table-cell">Studio</th>
                <th>Statut</th>
                <th className="hidden sm:table-cell text-right">Crédits</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone2-100">
              {user.bookings.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone2-400">
                    Aucune réservation
                  </td>
                </tr>
              )}
              {user.bookings.map((b) => {
                const st = BOOKING_STATUS[b.status] ?? { label: b.status, cls: "bg-stone2-100 text-stone2-700" };
                return (
                  <tr key={b.id}>
                    <td className="py-2 font-medium">{b.session.classType.name}</td>
                    <td className="text-stone2-600 whitespace-nowrap">
                      {formatDateShort(b.session.startTime)}
                    </td>
                    <td className="hidden md:table-cell text-stone2-500">
                      {b.session.location.name}
                    </td>
                    <td>
                      <span className={`badge ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="hidden sm:table-cell text-right">{b.creditsUsed}</td>
                    <td>
                      {(b.status === "CONFIRMED" || b.status === "ATTENDED") && b.creditsUsed > 0 && (
                        <form action={adminRefundBookingAction}>
                          <input type="hidden" name="bookingId" value={b.id} />
                          <button className="text-xs text-stone2-500 hover:text-brand-600 hover:underline">
                            Rembourser
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transactions */}
      <div className="card space-y-4">
        <h2 className="font-serif text-xl font-medium text-brand-600">Historique transactions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] uppercase tracking-[0.18em] text-stone2-500 border-b border-stone2-100">
              <tr>
                <th className="pb-2">Date</th>
                <th>Type</th>
                <th className="hidden md:table-cell">Description</th>
                <th className="text-right">Montant</th>
                <th className="text-right">Crédits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone2-100">
              {user.transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-stone2-400">
                    Aucune transaction
                  </td>
                </tr>
              )}
              {user.transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="py-2 text-stone2-600 whitespace-nowrap">
                    {relativeTime(tx.createdAt)}
                  </td>
                  <td>
                    <span className="badge bg-stone2-100 text-stone2-700 text-[10px]">
                      {TX_LABEL[tx.type] ?? tx.type}
                    </span>
                  </td>
                  <td className="hidden md:table-cell text-stone2-500 max-w-[220px] truncate">
                    {tx.description ?? tx.plan?.name ?? "—"}
                  </td>
                  <td className="text-right">
                    {tx.amountCents > 0 ? formatPrice(tx.amountCents) : "—"}
                  </td>
                  <td className={`text-right font-medium ${tx.creditsDelta > 0 ? "text-green-700" : tx.creditsDelta < 0 ? "text-red-600" : "text-stone2-400"}`}>
                    {tx.creditsDelta > 0 ? `+${tx.creditsDelta}` : tx.creditsDelta === 0 ? "—" : tx.creditsDelta}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
