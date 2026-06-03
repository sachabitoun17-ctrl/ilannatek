"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelAction } from "../schedule/actions";
import { freezeSubscriptionAction as freezeAction, unfreezeSubscriptionAction as unfreezeAction } from "./actions";
import { freezeCredits, unfreezeCredits } from "./freeze-actions";
import { formatPrice } from "@/lib/utils";
import { BookingQRButton } from "@/components/BookingQRButton";

type UpcomingBooking = {
  id: string;
  sessionId: string;
  status: string;
  waitlistPos: number | null;
  classTypeName: string;
  classTypeColor: string;
  creditCost: number;
  startTime: string;
  endTime: string;
  instructorName: string;
  locationName: string;
  locationAddress: string | null;
  checkedIn: boolean;
  calLink: string;
  sessionNotes: string | null;
};

type PastBooking = {
  id: string;
  status: string;
  classTypeName: string;
  classTypeColor: string;
  startTime: string;
  instructorName: string;
  locationName: string;
  creditsUsed: number;
  feeApplied: number;
};

type Sub = {
  id: string;
  planName: string;
  status: string;
  startDate: string;
  endDate: string;
  frozenAt: string | null;
};

type Tx = {
  id: string;
  type: string;
  description: string | null;
  creditsDelta: number;
  amountCents: number;
  createdAt: string;
};

const TX_LABELS: Record<string, string> = {
  PURCHASE_PACK: "Achat pack",
  PURCHASE_SUBSCRIPTION: "Abonnement",
  CREDIT_USE: "Cours réservé",
  CREDIT_REFUND: "Remboursement",
  CREDIT_ADJUST: "Ajustement",
  LATE_CANCEL_FEE: "Frais annulation tardive",
  NO_SHOW_FEE: "Frais absence",
  PROMO_BONUS: "Bonus promo",
  WELCOME_CREDITS: "Crédits bienvenue",
};

const STATUS_LABELS: Record<string, { label: string; classes: string }> = {
  CONFIRMED: { label: "Confirmée", classes: "bg-brand-600 text-cream-50" },
  WAITLIST: { label: "Liste d'attente", classes: "bg-accent-100 text-accent-600" },
  ATTENDED: { label: "✓ Présent·e", classes: "bg-green-100 text-green-800" },
  NO_SHOW: { label: "Absent·e", classes: "bg-red-100 text-red-800" },
  CANCELLED: { label: "Annulée", classes: "bg-stone2-100 text-stone2-500" },
  LATE_CANCEL: { label: "Annulation tardive", classes: "bg-orange-100 text-orange-800" },
};

export default function AccountTabs({
  upcoming,
  past,
  subs,
  transactions,
  isFrozen,
  creditsFrozenUntil,
}: {
  upcoming: UpcomingBooking[];
  past: PastBooking[];
  subs: Sub[];
  transactions: Tx[];
  isFrozen: boolean;
  creditsFrozenUntil: string | null;
}) {
  const tabs = ["À venir", "Historique", "Abonnements", "Achats", "Pause"] as const;
  const [tab, setTab] = useState<(typeof tabs)[number]>("À venir");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-stone2-200 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-3 text-[11px] uppercase tracking-[0.2em] shrink-0 transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-brand-600 text-brand-600 font-semibold"
                : "border-transparent text-stone2-500 hover:text-brand-600"
            }`}
          >
            {t}
            {t === "À venir" && upcoming.length > 0 && (
              <span className="ml-1.5 bg-brand-600 text-cream-50 text-[9px] px-1.5 py-0.5 rounded-full">
                {upcoming.length}
              </span>
            )}
          </button>
        ))}
        {/* Navigation link to the recurring slots page */}
        <Link
          href="/account/recurring"
          className="px-5 py-3 text-[11px] uppercase tracking-[0.2em] shrink-0 transition-colors border-b-2 border-transparent text-stone2-500 hover:text-brand-600"
        >
          Créneaux récurrents
        </Link>
      </div>

      <div className="mt-5">
        {tab === "À venir" && <UpcomingTab bookings={upcoming} />}
        {tab === "Historique" && <PastTab bookings={past} />}
        {tab === "Abonnements" && <SubsTab subs={subs} />}
        {tab === "Achats" && <TransactionsTab transactions={transactions} />}
        {tab === "Pause" && (
          <PauseTab isFrozen={isFrozen} creditsFrozenUntil={creditsFrozenUntil} />
        )}
      </div>
    </div>
  );
}

// ─── Upcoming tab ─────────────────────────────────────────────────────────────

function UpcomingTab({ bookings }: { bookings: UpcomingBooking[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const doCancel = (id: string) => {
    startTransition(async () => {
      await cancelAction(id);
      setCancelingId(null);
      setMessage("Réservation annulée");
      router.refresh();
      setTimeout(() => setMessage(null), 3000);
    });
  };

  if (bookings.length === 0)
    return (
      <div className="text-center py-16">
        <p className="font-serif text-2xl text-stone2-400">Aucun cours à venir</p>
        <p className="text-sm text-stone2-500 mt-2 mb-6">Trouvez votre prochain cours et réservez-le.</p>
        <Link href="/schedule" className="btn-primary">Voir le planning</Link>
      </div>
    );

  return (
    <div className="space-y-3">
      {message && (
        <p className="text-sm text-brand-600 border border-brand-600 px-4 py-2 bg-cream-100">{message}</p>
      )}
      {bookings.map((b) => {
        const start = new Date(b.startTime);
        const now = new Date();
        const msUntil = start.getTime() - now.getTime();
        const daysUntil = Math.floor(msUntil / 86400000);
        const hoursUntil = Math.floor((msUntil % 86400000) / 3600000);
        const isToday = start.toDateString() === now.toDateString();
        const isTomorrow = start.toDateString() === new Date(now.getTime() + 86400000).toDateString();
        const isCheckInOpen = msUntil <= 30 * 60000 && msUntil >= -90 * 60000;
        const isConfirming = cancelingId === b.id;

        let dateLabel = "";
        if (isToday) dateLabel = "Aujourd'hui";
        else if (isTomorrow) dateLabel = "Demain";
        else if (daysUntil < 7) dateLabel = `Dans ${daysUntil} jours`;
        else dateLabel = start.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

        return (
          <div key={b.id} className="bg-white border border-stone2-200 flex flex-wrap gap-4 p-5">
            {/* Color strip */}
            <div className="w-1 self-stretch shrink-0" style={{ backgroundColor: b.classTypeColor }} />

            {/* Info */}
            <div className="flex-1 min-w-[200px]">
              <p className="section-title mb-0.5">{dateLabel} · {start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
              <h3 className="font-serif text-xl text-brand-600">{b.classTypeName}</h3>
              <p className="text-sm text-stone2-600">{b.instructorName}</p>
              <p className="text-xs text-stone2-400">{b.locationName}</p>
            </div>

            {/* Right side */}
            <div className="flex flex-col items-end justify-between gap-2 shrink-0">
              <span className={`badge ${STATUS_LABELS[b.status]?.classes ?? "bg-stone2-100 text-stone2-600"}`}>
                {b.status === "WAITLIST"
                  ? `Liste d'attente · #${b.waitlistPos}`
                  : STATUS_LABELS[b.status]?.label ?? b.status}
              </span>

              {b.checkedIn && (
                <span className="text-[10px] uppercase tracking-widest text-green-700">✓ Pointé·e</span>
              )}

              {b.sessionNotes && (
                <div className="w-full mt-1 text-xs text-stone2-500 border-l-2 border-accent-300 pl-2 italic">
                  {b.sessionNotes}
                </div>
              )}

              <div className="flex items-center gap-3">
                {isCheckInOpen && !b.checkedIn && (
                  <Link
                    href={`/check-in/${b.sessionId}`}
                    className="text-[10px] uppercase tracking-widest bg-brand-600 text-cream-50 px-3 py-1.5 hover:bg-brand-700"
                  >
                    S'enregistrer
                  </Link>
                )}

                <BookingQRButton
                  sessionId={b.sessionId}
                  className={b.classTypeName}
                  time={new Date(b.startTime).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                  location={b.locationName}
                />

                <a
                  href={b.calLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Ajouter au calendrier Google"
                  className="text-stone2-400 hover:text-brand-600 text-lg leading-none"
                >
                  📅
                </a>

                {isConfirming ? (
                  <>
                    <button onClick={() => doCancel(b.id)} disabled={pending}
                      className="text-[10px] uppercase tracking-widest text-red-800 font-medium">
                      {pending ? "…" : "Confirmer"}
                    </button>
                    <button onClick={() => setCancelingId(null)} disabled={pending}
                      className="text-[10px] uppercase tracking-widest text-stone2-400">
                      Garder
                    </button>
                  </>
                ) : (
                  <button onClick={() => setCancelingId(b.id)} disabled={pending}
                    className="text-[10px] uppercase tracking-widest text-stone2-400 hover:text-red-800">
                    Annuler
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Past tab ─────────────────────────────────────────────────────────────────

function PastTab({ bookings }: { bookings: PastBooking[] }) {
  if (bookings.length === 0)
    return (
      <div className="text-center py-16">
        <p className="font-serif text-2xl text-stone2-400">Aucun cours passé</p>
        <p className="text-sm text-stone2-500 mt-2">Votre historique apparaîtra ici.</p>
      </div>
    );

  // Group by month
  const grouped = bookings.reduce<Record<string, PastBooking[]>>((acc, b) => {
    const d = new Date(b.startTime);
    const key = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    if (!acc[key]) acc[key] = [];
    acc[key].push(b);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([month, items]) => (
        <div key={month}>
          <p className="section-title capitalize mb-2">{month}</p>
          <div className="bg-white border border-stone2-200 divide-y divide-stone2-100">
            {items.map((b) => {
              const start = new Date(b.startTime);
              const statusInfo = STATUS_LABELS[b.status];
              return (
                <div key={b.id} className="flex flex-wrap items-center gap-4 px-5 py-3">
                  <div className="w-0.5 self-stretch shrink-0" style={{ backgroundColor: b.classTypeColor }} />
                  <div className="w-16 shrink-0 text-stone2-500 text-sm">
                    {start.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <p className="font-medium text-brand-600 text-sm">{b.classTypeName}</p>
                    <p className="text-xs text-stone2-500">{b.instructorName} · {b.locationName}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {b.feeApplied > 0 && (
                      <span className="text-[10px] text-orange-600">
                        -{b.feeApplied} cr. retenu{b.feeApplied > 1 ? "s" : ""}
                      </span>
                    )}
                    <span className={`badge text-[10px] ${statusInfo?.classes ?? "bg-stone2-100 text-stone2-500"}`}>
                      {statusInfo?.label ?? b.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Subscriptions tab ───────────────────────────────────────────────────────

function SubsTab({ subs }: { subs: Sub[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const doFreeze = (id: string) => startTransition(async () => { await freezeAction(id); router.refresh(); });
  const doUnfreeze = (id: string) => startTransition(async () => { await unfreezeAction(id); router.refresh(); });

  if (subs.length === 0)
    return (
      <div className="text-center py-16">
        <p className="font-serif text-2xl text-stone2-400">Aucun abonnement</p>
        <p className="text-sm text-stone2-500 mt-2 mb-6">Un accès illimité pour venir quand vous voulez.</p>
        <Link href="/subscriptions" className="btn-primary">Voir les offres</Link>
      </div>
    );

  return (
    <div className="space-y-3">
      {subs.map((s) => {
        const end = new Date(s.endDate);
        const now = new Date();
        const daysLeft = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 86400000));
        const statusMap: Record<string, { label: string; classes: string }> = {
          ACTIVE: { label: "Actif", classes: "bg-green-100 text-green-800" },
          FROZEN: { label: "En pause", classes: "bg-accent-100 text-accent-600" },
          CANCELLED: { label: "Annulé", classes: "bg-stone2-100 text-stone2-500" },
          EXPIRED: { label: "Expiré", classes: "bg-red-100 text-red-800" },
        };
        const info = statusMap[s.status] ?? { label: s.status, classes: "bg-stone2-100 text-stone2-600" };

        return (
          <div key={s.id} className="bg-white border border-stone2-200 p-5 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <h3 className="font-serif text-xl text-brand-600">{s.planName}</h3>
              <p className="text-xs text-stone2-500 mt-1">
                Du {new Date(s.startDate).toLocaleDateString("fr-FR")} au {end.toLocaleDateString("fr-FR")}
              </p>
              {s.status === "ACTIVE" && (
                <p className="text-xs text-stone2-500 mt-0.5">
                  {daysLeft > 0 ? `${daysLeft} jours restants` : "Expire aujourd'hui"}
                </p>
              )}
              {s.frozenAt && (
                <p className="text-xs text-accent-600 mt-0.5">
                  En pause depuis le {new Date(s.frozenAt).toLocaleDateString("fr-FR")}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={`badge ${info.classes}`}>{info.label}</span>
              {s.status === "ACTIVE" && (
                <button onClick={() => doFreeze(s.id)} disabled={pending}
                  className="btn-secondary text-sm py-1.5">
                  Mettre en pause
                </button>
              )}
              {s.status === "FROZEN" && (
                <button onClick={() => doUnfreeze(s.id)} disabled={pending}
                  className="btn-primary text-sm py-1.5">
                  Reprendre
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Transactions tab ────────────────────────────────────────────────────────

function TransactionsTab({ transactions }: { transactions: Tx[] }) {
  if (transactions.length === 0)
    return (
      <div className="text-center py-16">
        <p className="font-serif text-2xl text-stone2-400">Aucun achat</p>
        <p className="text-sm text-stone2-500 mt-2">Vos reçus et mouvements de crédits apparaîtront ici.</p>
      </div>
    );

  return (
    <>
      {/* Mobile cards */}
      <div className="sm:hidden divide-y divide-stone2-100 border border-stone2-200 bg-white">
        {transactions.map((t) => (
          <div key={t.id} className="px-4 py-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-brand-600 text-sm">{TX_LABELS[t.type] ?? t.type}</p>
              {t.description && <p className="text-xs text-stone2-500 mt-0.5 truncate">{t.description}</p>}
              <p className="text-[10px] text-stone2-400 mt-1">{new Date(t.createdAt).toLocaleDateString("fr-FR")}</p>
            </div>
            <div className="text-right shrink-0">
              {t.creditsDelta !== 0 && (
                <p className={`text-sm font-medium tabular-nums ${t.creditsDelta > 0 ? "text-green-700" : "text-red-700"}`}>
                  {t.creditsDelta > 0 ? `+${t.creditsDelta}` : t.creditsDelta} cr.
                </p>
              )}
              {t.amountCents > 0 && (
                <p className="text-xs text-stone2-600 tabular-nums">{formatPrice(t.amountCents)}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white border border-stone2-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone2-200">
              <th className="text-left px-5 py-3 text-[10px] uppercase tracking-widest text-stone2-400 font-normal">Date</th>
              <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-stone2-400 font-normal">Opération</th>
              <th className="text-right px-4 py-3 text-[10px] uppercase tracking-widest text-stone2-400 font-normal">Crédits</th>
              <th className="text-right px-5 py-3 text-[10px] uppercase tracking-widest text-stone2-400 font-normal">Montant</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone2-100">
            {transactions.map((t) => (
              <tr key={t.id} className="hover:bg-cream-50">
                <td className="px-5 py-3 text-stone2-500 whitespace-nowrap">
                  {new Date(t.createdAt).toLocaleDateString("fr-FR")}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-brand-600">{TX_LABELS[t.type] ?? t.type}</p>
                  {t.description && <p className="text-xs text-stone2-500">{t.description}</p>}
                </td>
                <td className={`px-4 py-3 text-right font-medium tabular-nums ${t.creditsDelta > 0 ? "text-green-700" : t.creditsDelta < 0 ? "text-red-700" : "text-stone2-400"}`}>
                  {t.creditsDelta > 0 ? `+${t.creditsDelta}` : t.creditsDelta !== 0 ? t.creditsDelta : "—"}
                </td>
                <td className="px-5 py-3 text-right text-stone2-600 tabular-nums">
                  {t.amountCents > 0 ? formatPrice(t.amountCents) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── Pause tab (freeze credits) ───────────────────────────────────────────────

const DURATIONS: { label: string; weeks: number }[] = [
  { label: "1 semaine", weeks: 1 },
  { label: "2 semaines", weeks: 2 },
  { label: "3 semaines", weeks: 3 },
  { label: "1 mois", weeks: 4 },
];

function PauseTab({
  isFrozen,
  creditsFrozenUntil,
}: {
  isFrozen: boolean;
  creditsFrozenUntil: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedWeeks, setSelectedWeeks] = useState(1);
  const [message, setMessage] = useState<string | null>(null);

  const doFreeze = () => {
    startTransition(async () => {
      await freezeCredits(selectedWeeks);
      setMessage("Vos crédits ont été gelés.");
      router.refresh();
      setTimeout(() => setMessage(null), 4000);
    });
  };

  const doUnfreeze = () => {
    startTransition(async () => {
      await unfreezeCredits();
      setMessage("Le gel a été annulé.");
      router.refresh();
      setTimeout(() => setMessage(null), 4000);
    });
  };

  return (
    <div className="max-w-lg">
      {message && (
        <p className="text-sm text-brand-600 border border-brand-600 px-4 py-2 bg-cream-100 mb-4">
          {message}
        </p>
      )}

      {isFrozen ? (
        <div className="bg-white border border-stone2-200 p-6 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-accent-600 mb-1">Crédits en pause</p>
            <p className="font-serif text-2xl text-brand-600">
              Crédits gelés jusqu&apos;au{" "}
              {creditsFrozenUntil
                ? new Date(creditsFrozenUntil).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "—"}
            </p>
            <p className="text-sm text-stone2-500 mt-2">
              Vos crédits ne peuvent pas être utilisés pendant cette période.
            </p>
          </div>
          <button
            onClick={doUnfreeze}
            disabled={pending}
            className="btn-secondary"
          >
            {pending ? "…" : "Annuler le gel"}
          </button>
        </div>
      ) : (
        <div className="bg-white border border-stone2-200 p-6 space-y-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone2-400 mb-1">Pause crédits</p>
            <p className="font-serif text-2xl text-brand-600 mb-2">Geler mes crédits</p>
            <p className="text-sm text-stone2-500 leading-relaxed">
              Geler vos crédits empêche leur utilisation pendant vos absences.
              Vos crédits ne disparaissent pas — ils vous attendent à votre retour.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.15em] text-stone2-400">Durée</p>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.weeks}
                  onClick={() => setSelectedWeeks(d.weeks)}
                  className={`px-4 py-2 text-sm border transition-colors ${
                    selectedWeeks === d.weeks
                      ? "bg-brand-600 text-cream-50 border-brand-600"
                      : "bg-white text-brand-600 border-stone2-300 hover:border-brand-600"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={doFreeze}
            disabled={pending}
            className="btn-primary"
          >
            {pending ? "…" : "Geler mes crédits"}
          </button>
        </div>
      )}
    </div>
  );
}
