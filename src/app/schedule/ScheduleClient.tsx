"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { formatDate, formatTime } from "@/lib/utils";
import { bookAction, cancelAction } from "./actions";

type SessionItem = {
  id: string;
  startTime: string;
  endTime: string;
  capacity: number;
  confirmedCount: number;
  waitlistCount: number;
  classType: {
    name: string;
    color: string;
    creditCost: number;
    durationMin: number;
  };
  instructor: string;
  location: string;
  myBooking: { id: string; status: string; waitlistPos: number | null } | null;
};

type Day = { date: string; sessions: SessionItem[] };

type BookConfirm = {
  session: SessionItem;
  mode: "book" | "waitlist" | "no-credits";
};

type CancelConfirm = {
  bookingId: string;
  sessionName: string;
};

export default function ScheduleClient({
  days,
  userCredits,
  isLoggedIn,
  view,
}: {
  days: Day[];
  userCredits: number | null;
  isLoggedIn: boolean;
  view: "day" | "week" | "grid";
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; kind: "ok" | "err" } | null>(
    null
  );
  const [bookConfirm, setBookConfirm] = useState<BookConfirm | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<CancelConfirm | null>(null);

  const requestBook = (s: SessionItem) => {
    if (!isLoggedIn) {
      window.location.href = "/login?next=/schedule";
      return;
    }
    const full = s.confirmedCount >= s.capacity;
    if (full) {
      setBookConfirm({ session: s, mode: "waitlist" });
      return;
    }
    if (userCredits !== null && userCredits < s.classType.creditCost) {
      setBookConfirm({ session: s, mode: "no-credits" });
      return;
    }
    setBookConfirm({ session: s, mode: "book" });
  };

  const confirmBook = (sessionId: string) => {
    startTransition(async () => {
      const result = await bookAction(sessionId);
      setBookConfirm(null);
      if (result.ok) {
        setMessage({
          text:
            result.status === "CONFIRMED"
              ? "✓ Cours réservé"
              : `Inscrit·e sur liste d'attente (position ${result.position})`,
          kind: "ok",
        });
      } else {
        setMessage({ text: result.error, kind: "err" });
      }
      setTimeout(() => setMessage(null), 4000);
    });
  };

  const confirmCancel = (bookingId: string) => {
    startTransition(async () => {
      const result = await cancelAction(bookingId);
      setCancelConfirm(null);
      setMessage(
        result.ok
          ? { text: "Réservation annulée", kind: "ok" }
          : { text: result.error ?? "Erreur", kind: "err" }
      );
      setTimeout(() => setMessage(null), 4000);
    });
  };

  return (
    <div className="space-y-8">
      {message && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 text-sm border ${
            message.kind === "ok"
              ? "bg-cream-50 border-brand-600 text-brand-600"
              : "bg-red-50 border-red-700 text-red-900"
          }`}
        >
          {message.text}
        </div>
      )}

      {bookConfirm && (
        <BookingModal
          confirm={bookConfirm}
          pending={pending}
          onClose={() => setBookConfirm(null)}
          onConfirm={() => confirmBook(bookConfirm.session.id)}
        />
      )}

      {cancelConfirm && (
        <CancelModal
          confirm={cancelConfirm}
          pending={pending}
          onClose={() => setCancelConfirm(null)}
          onConfirm={() => confirmCancel(cancelConfirm.bookingId)}
        />
      )}

      {view === "grid" ? (
        <WeekGrid
          days={days}
          isLoggedIn={isLoggedIn}
          onRequestBook={requestBook}
          onRequestCancel={(b, name) => setCancelConfirm({ bookingId: b, sessionName: name })}
        />
      ) : (
        days.map((day) => (
          <div key={day.date}>
            {view === "week" && (
              <h2 className="font-serif text-2xl capitalize mb-4 text-brand-600">
                {formatDate(day.date)}
              </h2>
            )}
            {day.sessions.length === 0 ? (
              <p className="text-sm text-stone2-400 italic px-4 py-12 text-center">
                Aucun cours ce jour
              </p>
            ) : view === "day" ? (
              <div className="bg-white border border-stone2-200 divide-y divide-stone2-100">
                {day.sessions.map((s) => (
                  <SessionRow
                    key={s.id}
                    s={s}
                    isLoggedIn={isLoggedIn}
                    pending={pending}
                    onRequestBook={requestBook}
                    onRequestCancel={(id, name) =>
                      setCancelConfirm({ bookingId: id, sessionName: name })
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {day.sessions.map((s) => (
                  <SessionCard
                    key={s.id}
                    s={s}
                    isLoggedIn={isLoggedIn}
                    pending={pending}
                    onRequestBook={requestBook}
                    onRequestCancel={(id, name) =>
                      setCancelConfirm({ bookingId: id, sessionName: name })
                    }
                  />
                ))}
              </div>
            )}
          </div>
        ))
      )}

      {isLoggedIn && userCredits !== null && (
        <p className="text-sm text-stone2-500 text-center pt-4">
          Solde actuel :{" "}
          <strong className="text-brand-600">{userCredits} crédits</strong>
          {" · "}
          <Link href="/packs" className="underline hover:text-brand-600">
            recharger
          </Link>
        </p>
      )}
    </div>
  );
}

// ============== WEEK GRID (time-grid calendar) ==============

function WeekGrid({
  days,
  isLoggedIn,
  onRequestBook,
  onRequestCancel,
}: {
  days: Day[];
  isLoggedIn: boolean;
  onRequestBook: (s: SessionItem) => void;
  onRequestCancel: (bookingId: string, name: string) => void;
}) {
  // Build hour range from earliest to latest session of the week
  const allSessions = days.flatMap((d) => d.sessions);
  const { startHour, endHour } = useMemo(() => {
    if (allSessions.length === 0) return { startHour: 7, endHour: 22 };
    let min = 23;
    let max = 0;
    for (const s of allSessions) {
      const start = new Date(s.startTime);
      const end = new Date(s.endTime);
      if (start.getHours() < min) min = start.getHours();
      const endH = end.getHours() + (end.getMinutes() > 0 ? 1 : 0);
      if (endH > max) max = endH;
    }
    return {
      startHour: Math.max(6, min - 1),
      endHour: Math.min(23, Math.max(max + 1, min + 6)),
    };
  }, [allSessions]);

  const HOUR_HEIGHT = 64; // px per hour
  const totalHours = endHour - startHour;
  const gridHeight = totalHours * HOUR_HEIGHT;

  const hours = Array.from({ length: totalHours + 1 }).map(
    (_, i) => startHour + i
  );

  return (
    <div className="bg-white border border-stone2-200 cal-scroll overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Day headers */}
        <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-stone2-200 bg-cream-100">
          <div />
          {days.map((d) => {
            const date = new Date(d.date);
            const isToday = date.toDateString() === new Date().toDateString();
            return (
              <div
                key={d.date}
                className={`px-2 py-3 text-center border-l border-stone2-200 ${
                  isToday ? "bg-accent-50" : ""
                }`}
              >
                <p className="text-[10px] uppercase tracking-widest text-stone2-500">
                  {date.toLocaleDateString("fr-FR", { weekday: "short" })}
                </p>
                <p
                  className={`font-serif text-2xl ${
                    isToday ? "text-accent-600" : "text-brand-600"
                  }`}
                >
                  {date.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div
          className="grid grid-cols-[64px_repeat(7,1fr)] relative"
          style={{ height: gridHeight }}
        >
          {/* Hour labels */}
          <div className="relative">
            {hours.map((h, i) => (
              <div
                key={h}
                className="absolute left-0 right-0 text-[10px] text-stone2-400 text-right pr-2 -translate-y-1/2"
                style={{ top: i * HOUR_HEIGHT }}
              >
                {h.toString().padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d, dayIdx) => (
            <div
              key={d.date}
              className="relative border-l border-stone2-100"
            >
              {/* Hour grid lines */}
              {hours.map((h, i) => (
                <div
                  key={h}
                  className={`absolute left-0 right-0 border-t ${
                    i === 0 ? "border-stone2-200" : "border-stone2-100"
                  }`}
                  style={{ top: i * HOUR_HEIGHT }}
                />
              ))}

              {/* Sessions */}
              {d.sessions.map((s) => {
                const start = new Date(s.startTime);
                const end = new Date(s.endTime);
                const startMin =
                  (start.getHours() - startHour) * 60 + start.getMinutes();
                const durMin = (end.getTime() - start.getTime()) / 60000;
                const top = (startMin / 60) * HOUR_HEIGHT;
                const height = Math.max(36, (durMin / 60) * HOUR_HEIGHT - 2);
                const full = s.confirmedCount >= s.capacity;
                const isMine = !!s.myBooking;

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      isMine
                        ? onRequestCancel(s.myBooking!.id, s.classType.name)
                        : onRequestBook(s)
                    }
                    className="absolute left-1 right-1 text-left px-2 py-1.5 overflow-hidden transition-all hover:translate-y-[-1px] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent-400"
                    style={{
                      top,
                      height,
                      background: isMine
                        ? "#1C1C1A"
                        : full
                        ? "#EFEAE0"
                        : "white",
                      color: isMine ? "#F7F3EC" : "#1C1C1A",
                      borderLeft: `3px solid ${s.classType.color}`,
                      border: isMine
                        ? `1px solid #1C1C1A`
                        : `1px solid #DDD5C5`,
                    }}
                    title={`${formatTime(s.startTime)} ${s.classType.name} · ${s.instructor}`}
                  >
                    <p className="text-[10px] font-semibold leading-tight">
                      {formatTime(s.startTime)}
                    </p>
                    <p className="text-xs font-medium leading-tight truncate">
                      {s.classType.name}
                    </p>
                    {height > 50 && (
                      <p
                        className={`text-[10px] truncate ${
                          isMine ? "text-stone2-300" : "text-stone2-500"
                        }`}
                      >
                        {s.instructor}
                      </p>
                    )}
                    {height > 70 && (
                      <p
                        className={`text-[9px] mt-1 uppercase tracking-wider ${
                          isMine
                            ? "text-accent-300"
                            : full
                            ? "text-red-700"
                            : "text-stone2-400"
                        }`}
                      >
                        {isMine
                          ? s.myBooking!.status === "CONFIRMED"
                            ? "Réservé"
                            : `#${s.myBooking!.waitlistPos}`
                          : full
                          ? "Complet"
                          : `${s.capacity - s.confirmedCount} places`}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============== MODALS ==============

function BookingModal({
  confirm,
  pending,
  onClose,
  onConfirm,
}: {
  confirm: BookConfirm;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { session: s, mode } = confirm;
  const start = new Date(s.startTime);
  const dateLabel = start.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-brand-600/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-cream-50 max-w-md w-full border border-stone2-200 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-6 py-5 border-b border-stone2-200"
          style={{ borderLeft: `4px solid ${s.classType.color}` }}
        >
          <p className="section-title">{dateLabel}</p>
          <h2 className="font-serif text-2xl text-brand-600 mt-1">
            {s.classType.name}
          </h2>
          <p className="text-sm text-stone2-500 mt-1">
            {formatTime(s.startTime)} — {formatTime(s.endTime)} ·{" "}
            {s.classType.durationMin} min
          </p>
          <p className="text-sm text-stone2-500">
            {s.instructor} · {s.location}
          </p>
        </div>

        {mode === "no-credits" ? (
          <div className="px-6 py-6">
            <p className="text-sm text-brand-600 mb-2 font-medium">
              Solde insuffisant
            </p>
            <p className="text-sm text-stone2-500 mb-6 leading-relaxed">
              Ce cours coûte{" "}
              <strong>
                {s.classType.creditCost} crédit
                {s.classType.creditCost > 1 ? "s" : ""}
              </strong>
              . Achetez un pack pour réserver.
            </p>
            <div className="flex gap-2">
              <Link
                href={`/packs?from=schedule`}
                className="btn-primary flex-1 text-center"
              >
                Acheter des crédits
              </Link>
              <button onClick={onClose} className="btn-secondary">
                Fermer
              </button>
            </div>
          </div>
        ) : mode === "waitlist" ? (
          <div className="px-6 py-6">
            <p className="text-sm text-brand-600 mb-2 font-medium">
              Cours complet
            </p>
            <p className="text-sm text-stone2-500 mb-6 leading-relaxed">
              {s.waitlistCount > 0
                ? `${s.waitlistCount} personne${
                    s.waitlistCount > 1 ? "s sont" : " est"
                  } déjà en liste d'attente.`
                : "Vous serez le·la premier·ère sur la liste d'attente."}{" "}
              Aucun crédit ne sera débité tant qu'une place ne se libère pas.
            </p>
            <div className="flex gap-2">
              <button
                onClick={onConfirm}
                disabled={pending}
                className="btn-primary flex-1"
              >
                {pending ? "..." : "Rejoindre la liste"}
              </button>
              <button onClick={onClose} className="btn-secondary">
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 py-6">
            <p className="text-sm text-brand-600 mb-2 font-medium">
              Confirmer la réservation
            </p>
            <div className="bg-cream-100 border border-stone2-200 px-4 py-3 mb-6 flex items-center justify-between">
              <span className="text-sm text-stone2-600">Coût</span>
              <span className="font-serif text-xl text-brand-600">
                {s.classType.creditCost} crédit
                {s.classType.creditCost > 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-[11px] text-stone2-400 mb-6 leading-relaxed">
              Annulation gratuite jusqu'à 2h avant le cours. Au-delà, le crédit
              est retenu.
            </p>
            <div className="flex gap-2">
              <button
                onClick={onConfirm}
                disabled={pending}
                className="btn-primary flex-1"
              >
                {pending ? "..." : "Confirmer"}
              </button>
              <button onClick={onClose} className="btn-secondary">
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CancelModal({
  confirm,
  pending,
  onClose,
  onConfirm,
}: {
  confirm: CancelConfirm;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-brand-600/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-cream-50 max-w-md w-full border border-stone2-200 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-6">
          <p className="section-title">Annulation</p>
          <h2 className="font-serif text-2xl text-brand-600 mt-1 mb-3">
            Annuler {confirm.sessionName} ?
          </h2>
          <p className="text-sm text-stone2-500 mb-6 leading-relaxed">
            Si l'annulation est faite plus de 2h avant le cours, le crédit est
            remboursé. En-deçà, un crédit reste retenu.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onConfirm}
              disabled={pending}
              className="btn-danger flex-1"
            >
              {pending ? "..." : "Confirmer l'annulation"}
            </button>
            <button onClick={onClose} className="btn-secondary">
              Garder ma place
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============== SESSION ROW (day view) ==============

function SessionRow({
  s,
  isLoggedIn,
  pending,
  onRequestBook,
  onRequestCancel,
}: {
  s: SessionItem;
  isLoggedIn: boolean;
  pending: boolean;
  onRequestBook: (s: SessionItem) => void;
  onRequestCancel: (id: string, name: string) => void;
}) {
  const full = s.confirmedCount >= s.capacity;
  const spotsLeft = Math.max(0, s.capacity - s.confirmedCount);
  const isMine = !!s.myBooking;

  return (
    <div className="flex flex-wrap items-center gap-4 px-5 py-4">
      <div
        className="w-1 self-stretch shrink-0"
        style={{ background: s.classType.color, minHeight: "2.5rem" }}
      />
      <div className="w-24 shrink-0">
        <div className="font-serif text-xl text-brand-600">
          {formatTime(s.startTime)}
        </div>
        <div className="text-[10px] uppercase tracking-widest text-stone2-400">
          {s.classType.durationMin}min
        </div>
      </div>
      <div className="flex-1 min-w-[180px]">
        <div className="font-serif text-lg text-brand-600">
          {s.classType.name}
        </div>
        <div className="text-sm text-stone2-600">
          {s.instructor} · {s.location}
        </div>
      </div>
      <div className="text-xs text-stone2-500 min-w-[120px]">
        {full ? (
          <span className="text-red-800 font-medium">
            Complet · {s.waitlistCount} en attente
          </span>
        ) : (
          <span>
            {spotsLeft} place{spotsLeft > 1 ? "s" : ""}
          </span>
        )}
        <div className="text-[10px] uppercase tracking-widest text-stone2-400 mt-0.5">
          {s.classType.creditCost} crédit
          {s.classType.creditCost > 1 ? "s" : ""}
        </div>
      </div>
      <div className="shrink-0">
        {isMine ? (
          <div className="flex items-center gap-3">
            <span
              className={`badge ${
                s.myBooking!.status === "CONFIRMED"
                  ? "bg-brand-600 text-cream-50"
                  : "bg-accent-100 text-brand-600"
              }`}
            >
              {s.myBooking!.status === "CONFIRMED"
                ? "Réservé"
                : `#${s.myBooking!.waitlistPos}`}
            </span>
            <button
              onClick={() => onRequestCancel(s.myBooking!.id, s.classType.name)}
              disabled={pending}
              className="text-[11px] uppercase tracking-widest text-stone2-500 hover:text-red-800"
            >
              Annuler
            </button>
          </div>
        ) : isLoggedIn ? (
          <button
            onClick={() => onRequestBook(s)}
            disabled={pending}
            className={full ? "btn-secondary" : "btn-primary"}
          >
            {full ? "Liste d'attente" : "Réserver"}
          </button>
        ) : (
          <a href="/login" className="btn-secondary">
            Se connecter
          </a>
        )}
      </div>
    </div>
  );
}

// ============== SESSION CARD (week list view) ==============

function SessionCard({
  s,
  isLoggedIn,
  pending,
  onRequestBook,
  onRequestCancel,
}: {
  s: SessionItem;
  isLoggedIn: boolean;
  pending: boolean;
  onRequestBook: (s: SessionItem) => void;
  onRequestCancel: (id: string, name: string) => void;
}) {
  const full = s.confirmedCount >= s.capacity;
  const spotsLeft = Math.max(0, s.capacity - s.confirmedCount);
  const isMine = !!s.myBooking;

  return (
    <div
      className="card flex flex-col gap-3"
      style={{ borderLeftWidth: 3, borderLeftColor: s.classType.color }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="section-title">
            {formatTime(s.startTime)} — {formatTime(s.endTime)}
          </p>
          <h3 className="font-serif text-xl text-brand-600">
            {s.classType.name}
          </h3>
          <p className="text-sm text-stone2-600">{s.instructor}</p>
          <p className="text-xs text-stone2-500">{s.location}</p>
        </div>
        <span className="badge bg-cream-100 text-stone2-600 border border-stone2-200">
          {s.classType.creditCost} cr.
        </span>
      </div>
      <div className="text-xs text-stone2-500">
        {full ? (
          <span className="text-red-800 font-medium">
            Complet — {s.waitlistCount} en attente
          </span>
        ) : (
          <span>
            {spotsLeft} place{spotsLeft > 1 ? "s" : ""} disponible
            {spotsLeft > 1 ? "s" : ""}
          </span>
        )}
      </div>
      {isMine ? (
        <div className="flex flex-col gap-1">
          <span
            className={`badge ${
              s.myBooking!.status === "CONFIRMED"
                ? "bg-brand-600 text-cream-50"
                : "bg-accent-100 text-brand-600"
            }`}
          >
            {s.myBooking!.status === "CONFIRMED"
              ? "Réservé"
              : `Liste d'attente · #${s.myBooking!.waitlistPos}`}
          </span>
          <button
            onClick={() => onRequestCancel(s.myBooking!.id, s.classType.name)}
            disabled={pending}
            className="text-[11px] uppercase tracking-widest text-stone2-500 hover:text-red-800 mt-1 self-start"
          >
            Annuler
          </button>
        </div>
      ) : isLoggedIn ? (
        <button
          onClick={() => onRequestBook(s)}
          disabled={pending}
          className={full ? "btn-secondary w-full" : "btn-primary w-full"}
        >
          {full ? "Liste d'attente" : "Réserver"}
        </button>
      ) : (
        <a href="/login" className="btn-secondary text-center w-full">
          Se connecter
        </a>
      )}
    </div>
  );
}
