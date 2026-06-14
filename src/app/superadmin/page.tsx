export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";

export default async function SuperAdminDashboard({
  searchParams,
}: {
  searchParams: { created?: string };
}) {
  const now = new Date();
  const createdSlug = searchParams?.created;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    accounts,
    studioCount,
    userCount,
    activeMembers,
    sessionsThisMonth,
    paidThisMonth,
    activeSubs,
  ] = await Promise.all([
    db.account.findMany({
      orderBy: { createdAt: "asc" },
      include: { studios: { orderBy: { createdAt: "asc" } } },
    }),
    db.studio.count(),
    db.user.count({ where: { role: "USER" } }),
    db.user.count({ where: { role: "USER", active: true } }),
    db.session.count({ where: { startTime: { gte: monthStart } } }),
    db.transaction.aggregate({
      where: { paymentStatus: "PAID", createdAt: { gte: monthStart } },
      _sum: { amountCents: true },
    }),
    db.subscription.findMany({
      where: { status: "ACTIVE", endDate: { gt: now } },
      include: { plan: { select: { priceCents: true, intervalDays: true } } },
    }),
  ]);

  const revenueThisMonth = paidThisMonth._sum.amountCents ?? 0;
  const mrr = activeSubs.reduce(
    (sum, s) => sum + Math.round((s.plan.priceCents / (s.plan.intervalDays ?? 30)) * 30),
    0,
  );

  const planBadge: Record<string, string> = {
    PRO: "bg-accent-500/15 text-accent-300 border-accent-500/30",
    SCALE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    STARTER: "bg-white/10 text-stone2-300 border-white/15",
  };
  const statusDot: Record<string, string> = {
    ACTIVE: "bg-emerald-400",
    TRIAL: "bg-amber-400",
    SUSPENDED: "bg-red-400",
    PAUSED: "bg-stone2-500",
  };

  const stats = [
    { label: "Comptes clients", value: accounts.length },
    { label: "Studios", value: studioCount },
    { label: "Membres", value: userCount, sub: `${activeMembers} actifs` },
    { label: "MRR (global)", value: formatPrice(mrr), sub: "abonnements actifs" },
    { label: "Revenu ce mois", value: formatPrice(revenueThisMonth) },
    { label: "Séances ce mois", value: sessionsThisMonth },
  ];

  return (
    <div className="space-y-10">
      {createdSlug && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 flex items-center justify-between gap-4">
          <span>
            Client créé. Studio en ligne sur{" "}
            <Link href={`/studio/${createdSlug}`} className="underline hover:text-emerald-200">
              /studio/{createdSlug}
            </Link>
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-cream-50 font-medium">Vue d&apos;ensemble</h1>
          <p className="text-stone2-400 text-sm mt-1">
            Tous les clients, studios et indicateurs de la plateforme.
          </p>
        </div>
        <Link
          href="/superadmin/new"
          className="inline-flex items-center justify-center px-6 py-3 bg-accent-500 text-white text-[11px] uppercase tracking-[0.2em] font-semibold hover:bg-accent-400 active:scale-[0.98] transition-all shrink-0"
        >
          + Nouveau client
        </Link>
      </div>

      {/* Platform KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-2xl font-semibold text-cream-50 tabular">{s.value}</p>
            <p className="text-[11px] uppercase tracking-wider text-stone2-400 mt-1.5">{s.label}</p>
            {s.sub && <p className="text-[11px] text-stone2-500 mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Accounts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-cream-50 font-medium">Comptes clients</h2>
          <span className="text-xs text-stone2-500">{accounts.length} compte(s)</span>
        </div>

        <div className="space-y-3">
          {accounts.map((acc) => (
            <div key={acc.id} className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
              <div className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${statusDot[acc.status] ?? "bg-stone2-500"}`} />
                  <div className="min-w-0">
                    <p className="text-cream-50 font-medium truncate">{acc.name}</p>
                    <p className="text-xs text-stone2-500 truncate">
                      /{acc.slug}
                      {acc.contactEmail && ` · ${acc.contactEmail}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-stone2-400">{acc.studios.length} studio(s)</span>
                  <span className={`badge border ${planBadge[acc.plan] ?? planBadge.STARTER}`}>{acc.plan}</span>
                </div>
              </div>

              {acc.studios.length > 0 && (
                <div className="border-t border-white/5 divide-y divide-white/5">
                  {acc.studios.map((st) => (
                    <div key={st.id} className="flex items-center justify-between gap-4 px-5 py-3 pl-10">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusDot[st.status] ?? "bg-stone2-500"}`} />
                        <div className="min-w-0">
                          <p className="text-sm text-stone2-200 truncate">{st.name}</p>
                          <p className="text-[11px] text-stone2-500 truncate">
                            /studio/{st.slug}
                            {st.city && ` · ${st.city}`}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] uppercase tracking-wider text-stone2-500 shrink-0">
                        {st.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {accounts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
              <p className="text-stone2-400 text-sm mb-4">
                Aucun compte client pour l&apos;instant.
              </p>
              <Link
                href="/superadmin/new"
                className="inline-flex items-center justify-center px-6 py-3 bg-accent-500 text-white text-[11px] uppercase tracking-[0.2em] font-semibold hover:bg-accent-400 transition-colors"
              >
                Créer le premier client
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
