"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { formatTime } from "@/lib/utils";
import { bookAction, cancelAction } from "./actions";

type ClassTypeFilter = { id: string; name: string; color: string };

type SessionItem = {
  id: string;
  startTime: string;
  endTime: string;
  capacity: number;
  confirmedCount: number;
  waitlistCount: number;
  classType: {
    id: string;
    name: string;
    color: string;
    creditCost: number;
    durationMin: number;
    description: string | null;
  };
  instructor: {
    id: string;
    name: string;
    firstName: string;
    bio: string | null;
  };
  location: { name: string; address: string | null };
  myBooking: { id: string; status: string; waitlistPos: number | null } | null;
};

type Day = { date: string; sessions: SessionItem[] };

type BookConfirm = {
  session: SessionItem;
  mode: "book" | "waitlist" | "no-credits";
};

type CancelConfirm = { bookingId: string; sessionName: string };

function getUrgency(s: SessionItem, now: Date) {
  const start = new Date(s.startTime);
  const end = new Date(s.endTime);
  if (now >= start && now <= end) return "in-progress";
  if (now > end) return "past";
  if (s.confirmedCount >= s.capacity) return "full";
  const spotsLeft = s.capacity - s.confirmedCount;
  if (spotsLeft <= 3) return "last-spots";
  if (s.confirmedCount / s.capacity >= 0.7) return "filling";
  return "open";
}

function googleCalLink(s: SessionItem): string {
  const start = new Date(s.startTime);
  const end = new Date(s.endTime);
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${s.classType.name} — Ilannatek`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `Avec ${s.instructor.name}`,
    location: [s.location.name, s.location.address].filter(Boolean).join(", "),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export default function ScheduleClient({
  days,
  classTypes,
  userCredits,
  isLoggedIn,
  view,
  now,
}: {
  days: Day[];
  classTypes: ClassTypeFilter[];
  userCredits: number | null;
  isLoggedIn: boolean;
  view: "day" | "week" | "grid";
  now: string;
}) {
  const nowDate = new Date(now);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; kind: "ok" | "err" } | null>(null);
  const [bookConfirm, setBookConfirm] = useState<BookConfirm | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<CancelConfirm | null>(null);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [detailSession, setDetailSession] = useState<SessionItem | null>(null);

  const toggleType = (id: string) =>
    setFilterTypes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const filteredDays = useMemo(() => {
    if (filterTypes.length === 0) return days;
    return days.map((d) => ({
      ...d,
      sessions: d.sessions.filter((s) => filterTypes.includes(s.classType.id)),
    }));
  }, [days, filterTypes]);

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
              : `Inscrit·e liste d'attente (position ${result.position})`,
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

  // Determine which class types appear in current days
  const activeTypeIds = new Set(days.flatMap((d) => d.sessions.map((s) => s.classType.id)));
  const visibleClassTypes = classTypes.filter((ct) => activeTypeIds.has(ct.id));

  return (
    <div className="space-y-4">
      {/* Flash message */}
      {message && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 text-sm border shadow-lg ${
            message.kind === "ok"
              ? "bg-cream-50 border-brand-600 text-brand-600"
              : "bg-red-50 border-red-700 text-red-900"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Booking modal */}
      {bookConfirm && (
        <BookingModal
          confirm={bookConfirm}
          pending={pending}
          onClose={() => setBookConfirm(null)}
          onConfirm={() => confirmBook(bookConfirm.session.id)}
        />
      )}

      {/* Cancel modal */}
      {cancelConfirm && (
        <CancelModal
          confirm={cancelConfirm}
          pending={pending}
          onClose={() => setCancelConfirm(null)}
          onConfirm={() => confirmCancel(cancelConfirm.bookingId)}
        />
      )}

      {/* Session detail panel */}
      {detailSession && (
        <SessionDetailPanel
          s={detailSession}
          nowDate={nowDate}
          userCredits={userCredits}
          isLoggedIn={isLoggedIn}
          pending={pending}
          onClose={() => setDetailSession(null)}
          onBook={() => { setDetailSession(null); requestBook(detailSession); }}
          onCancel={() => { setDetailSession(null); setCancelConfirm({ bookingId: detailSession.myBooking!.id, sessionName: detailSession.classType.name }); }}
        />
      )}

      {/* Class type filter chips */}
      {visibleClassTypes.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => setFilterTypes([])}
            className={`shrink-0 px-3 py-1.5 text-[10px] uppercase tracking-widest border transition-colors ${
              filterTypes.length === 0
                ? "bg-brand-600 text-cream-50 border-brand-600"
                : "border-stone2-300 text-stone2-600 hover:border-brand-600"
            }`}
          >
            Tous
          </button>
          {visibleClassTypes.map((ct) => (
            <button
              key={ct.id}
              onClick={() => toggleType(ct.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-widest border transition-colors ${
                filterTypes.includes(ct.id)
                  ? "text-cream-50 border-transparent"
                  : "border-stone2-300 text-stone2-600 hover:border-brand-600"
              }`}
              style={filterTypes.includes(ct.id) ? { backgroundColor: ct.color, borderColor: ct.color } : {}}
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: ct.color }}
              />
              {ct.name}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {view === "grid" ? (
        <WeekGrid
          days={filteredDays}
          nowDate={nowDate}
          onOpen={setDetailSession}
        />
      ) : (
        filteredDays.map((day) => (
          <div key={day.date}>
            {view === "week" && (
              <h2 className="font-serif text-2xl capitalize mb-3 text-brand-600">
                {new Date(day.date).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </h2>
            )}
            {day.sessions.length === 0 ? (
              <p className="text-sm text-stone2-400 italic px-4 py-12 text-center">
                {filterTypes.length > 0 ? "Aucun cours de ce type ce jour" : "Aucun cours ce jour"}
              </p>
            ) : view === "day" ? (
              <div className="bg-white border border-stone2-200 divide-y divide-stone2-100">
                {day.sessions.map((s) => (
                  <SessionRow
                    key={s.id}
                    s={s}
                    nowDate={nowDate}
                    isLoggedIn={isLoggedIn}
                    pending={pending}
                    onOpen={setDetailSession}
                    onRequestBook={requestBook}
                    onRequestCancel={(id, name) => setCancelConfirm({ bookingId: id, sessionName: name })}
                  />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {day.sessions.map((s) => (
                  <SessionCard
                    key={s.id}
                    s={s}
                    nowDate={nowDate}
                    isLoggedIn={isLoggedIn}
                    pending={pending}
                    onOpen={setDetailSession}
                    onRequestBook={requestBook}
                    onRequestCancel={(id, name) => setCancelConfirm({ bookingId: id, sessionName: name })}
                  />
                ))}
              </div>
            )}
          </div>
        ))
      )}

      {isLoggedIn && userCredits !== null && (
        <p className="text-xs text-stone2-500 text-center pt-2">
          Solde :{" "}
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

// ─── Urgency badge ────────────────────────────────────────────────────────────

function UrgencyBadge({ urgency, waitlistCount }: { urgency: string; waitlistCount: number }) {
  if (urgency === "in-progress")
    return <span className="badge bg-green-700 text-cream-50 text-[9px]">En cours</span>;
  if (urgency === "full")
    return (
      <span className="badge bg-red-800 text-cream-50 text-[9px]">
        Complet · {waitlistCount > 0 ? `${waitlistCount} en attente` : "Liste d'attente"}
      </span>
    );
  if (urgency === "last-spots")
    return <span className="badge border border-amber-600 text-amber-700 text-[9px]">Dernières places</span>;
  if (urgency === "filling")
    return <span className="badge bg-amber-50 text-amber-700 text-[9px]">En cours de remplissage</span>;
  return null;
}

// ─── Week grid ────────────────────────────────────────────────────────────────

function WeekGrid({
  days,
  nowDate,
  onOpen,
}: {
  days: Day[];
  nowDate: Date;
  onOpen: (s: SessionItem) => void;
}) {
  const allSessions = days.flatMap((d) => d.sessions);
  const { startHour, endHour } = useMemo(() => {
    if (allSessions.length === 0) return { startHour: 7, endHour: 22 };
    let min = 23, max = 7;
    for (const s of allSessions) {
      const h = new Date(s.startTime).getHours();
      const eh = new Date(s.endTime).getHours() + (new Date(s.endTime).getMinutes() > 0 ? 1 : 0);
      if (h < min) min = h;
      if (eh > max) max = eh;
    }
    return { startHour: Math.max(6, min - 1), endHour: Math.min(23, Math.max(max + 1, min + 6)) };
  }, [allSessions]);

  const HOUR_HEIGHT = 72;
  const totalHours = endHour - startHour;
  const gridHeight = totalHours * HOUR_HEIGHT;
  const hours = Array.from({ length: totalHours + 1 }).map((_, i) => startHour + i);

  // Current time indicator
  const nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();
  const nowTop = ((nowMinutes - startHour * 60) / 60) * HOUR_HEIGHT;
  const showNow = nowTop >= 0 && nowTop <= gridHeight;

  return (
    <div className="bg-white border border-stone2-200 cal-scroll overflow-x-auto">
      <div className="min-w-[700px]">
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-stone2-200 bg-cream-100">
          <div />
          {days.map((d) => {
            const date = new Date(d.date);
            const isToday = date.toDateString() === nowDate.toDateString();
            return (
              <div
                key={d.date}
                className={`px-2 py-3 text-center border-l border-stone2-200 ${isToday ? "bg-accent-50" : ""}`}
              >
                <p className="text-[9px] uppercase tracking-widest text-stone2-500">
                  {date.toLocaleDateString("fr-FR", { weekday: "short" })}
                </p>
                <p className={`font-serif text-2xl leading-tight ${isToday ? "text-accent-600" : "text-brand-600"}`}>
                  {date.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-[56px_repeat(7,1fr)] relative" style={{ height: gridHeight }}>
          {/* Hour labels */}
          <div className="relative select-none">
            {hours.map((h, i) => (
              <div
                key={h}
                className="absolute left-0 right-0 text-[10px] text-stone2-400 text-right pr-2 -translate-y-1/2"
                style={{ top: i * HOUR_HEIGHT }}
              >
                {h.toString().padStart(2, "0")}h
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d) => (
            <div key={d.date} className="relative border-l border-stone2-100">
              {hours.map((h, i) => (
                <div
                  key={h}
                  className={`absolute left-0 right-0 border-t ${i === 0 ? "border-stone2-200" : "border-stone2-100"}`}
                  style={{ top: i * HOUR_HEIGHT }}
                />
              ))}
              {/* Half-hour lines */}
              {hours.slice(0, -1).map((h, i) => (
                <div
                  key={`${h}-half`}
                  className="absolute left-0 right-0 border-t border-dashed border-stone2-50"
                  style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                />
              ))}

              {/* Now indicator */}
              {showNow && d.date.slice(0, 10) === nowDate.toISOString().slice(0, 10) && (
                <div
                  className="absolute left-0 right-0 z-10 flex items-center"
                  style={{ top: nowTop }}
                >
                  <div className="h-2 w-2 rounded-full bg-red-500 -translate-x-1" />
                  <div className="flex-1 border-t border-red-400" />
                </div>
              )}

              {d.sessions.map((s) => {
                const start = new Date(s.startTime);
                const end = new Date(s.endTime);
                const startMin = (start.getHours() - startHour) * 60 + start.getMinutes();
                const durMin = (end.getTime() - start.getTime()) / 60000;
                const top = (startMin / 60) * HOUR_HEIGHT;
                const height = Math.max(32, (durMin / 60) * HOUR_HEIGHT - 2);
                const isMine = !!s.myBooking;
                const urgency = getUrgency(s, nowDate);

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onOpen(s)}
                    className="absolute left-1 right-1 text-left px-2 py-1.5 overflow-hidden transition-all hover:-translate-y-px hover:shadow-md focus:outline-none"
                    style={{
                      top,
                      height,
                      background: isMine ? "#1C1C1A" : urgency === "full" ? "#F5F0E8" : "white",
                      color: isMine ? "#F7F3EC" : "#1C1C1A",
                      borderLeft: `3px solid ${s.classType.color}`,
                      border: `1px solid ${urgency === "full" ? "#E8E0CE" : "#E0D8C8"}`,
                    }}
                    title={`${formatTime(s.startTime)} ${s.classType.name}`}
                  >
                    <p className="text-[10px] leading-tight opacity-70">{formatTime(s.startTime)}</p>
                    <p className="text-[11px] font-semibold leading-tight truncate">{s.classType.name}</p>
                    {height > 52 && (
                      <p className={`text-[10px] truncate ${isMine ? "opacity-60" : "text-stone2-500"}`}>
                        {s.instructor.firstName}
                      </p>
                    )}
                    {height > 72 && (
                      <p className={`text-[9px] uppercase tracking-wider mt-0.5 ${
                        isMine ? "text-accent-300" : urgency === "full" ? "text-red-700" : urgency === "last-spots" ? "text-amber-600" : "text-stone2-400"
                      }`}>
                        {isMine
                          ? s.myBooking!.status === "CONFIRMED" ? "Réservé ✓" : `#${s.myBooking!.waitlistPos}`
                          : urgency === "full" ? "Complet"
                          : urgency === "last-spots" ? `${s.capacity - s.confirmedCount} place${s.capacity - s.confirmedCount > 1 ? "s" : ""}`
                          : `${s.capacity - s.confirmedCount}/${s.capacity}`}
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

// ─── Session detail panel ────────────────────────────────────────────────────

function SessionDetailPanel({
  s,
  nowDate,
  userCredits,
  isLoggedIn,
  pending,
  onClose,
  onBook,
  onCancel,
}: {
  s: SessionItem;
  nowDate: Date;
  userCredits: number | null;
  isLoggedIn: boolean;
  pending: boolean;
  onClose: () => void;
  onBook: () => void;
  onCancel: () => void;
}) {
  const urgency = getUrgency(s, nowDate);
  const full = s.confirmedCount >= s.capacity;
  const spotsLeft = Math.max(0, s.capacity - s.confirmedCount);
  const isMine = !!s.myBooking;
  const fillPct = Math.round((s.confirmedCount / s.capacity) * 100);

  return (
    <div
      className="fixed inset-0 z-50 bg-brand-600/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-cream-50 w-full sm:max-w-md border border-stone2-200 shadow-2xl sm:rounded-none max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-stone2-200 flex items-start justify-between gap-3">
          <div>
            <div
              className="h-1 w-10 mb-3"
              style={{ backgroundColor: s.classType.color }}
            />
            <p className="section-title">
              {new Date(s.startTime).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
            <h2 className="font-serif text-3xl font-medium text-brand-600 mt-1">
              {s.classType.name}
            </h2>
            <p className="text-stone2-500 text-sm mt-1">
              {formatTime(s.startTime)} — {formatTime(s.endTime)}{" "}
              <span className="text-stone2-400">· {s.classType.durationMin} min</span>
            </p>
          </div>
          <button onClick={onClose} className="text-stone2-400 hover:text-brand-600 text-xl leading-none mt-1">
            ×
          </button>
        </div>

        {/* Info */}
        <div className="p-5 space-y-4">
          {/* Instructor */}
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-cream-50 font-serif text-base shrink-0"
              style={{ backgroundColor: s.classType.color }}
            >
              {s.instructor.firstName[0]}
            </div>
            <div>
              <p className="font-medium text-brand-600 text-sm">{s.instructor.name}</p>
              {s.instructor.bio && (
                <p className="text-xs text-stone2-500">{s.instructor.bio}</p>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="text-sm">
            <p className="text-brand-600 font-medium">📍 {s.location.name}</p>
            {s.location.address && (
              <p className="text-stone2-500 text-xs mt-0.5">{s.location.address}</p>
            )}
          </div>

          {/* Class description */}
          {s.classType.description && (
            <p className="text-sm text-stone2-600 leading-relaxed border-l-2 border-stone2-200 pl-3">
              {s.classType.description}
            </p>
          )}

          {/* Capacity bar */}
          <div>
            <div className="flex justify-between text-[10px] uppercase tracking-widest text-stone2-500 mb-1.5">
              <span>Remplissage</span>
              <span>
                {s.confirmedCount}/{s.capacity} inscrits
                {s.waitlistCount > 0 && ` · ${s.waitlistCount} en attente`}
              </span>
            </div>
            <div className="h-1.5 bg-stone2-100 rounded-full overflow-hidden">
              <div
                className="h-full transition-all"
                style={{
                  width: `${Math.min(100, fillPct)}%`,
                  backgroundColor:
                    fillPct >= 100
                      ? "#991b1b"
                      : fillPct >= 80
                      ? "#d97706"
                      : s.classType.color,
                }}
              />
            </div>
          </div>

          {/* Cost */}
          <div className="flex items-center justify-between bg-cream-100 border border-stone2-200 px-4 py-3">
            <span className="text-sm text-stone2-600">Coût</span>
            <span className="font-serif text-xl text-brand-600">
              {s.classType.creditCost} crédit{s.classType.creditCost > 1 ? "s" : ""}
            </span>
          </div>

          {/* Status + actions */}
          {isMine ? (
            <div className="space-y-2">
              <div
                className={`px-4 py-2.5 text-sm font-medium ${
                  s.myBooking!.status === "CONFIRMED"
                    ? "bg-brand-600 text-cream-50"
                    : "bg-accent-100 text-brand-600"
                }`}
              >
                {s.myBooking!.status === "CONFIRMED"
                  ? "✓ Vous êtes inscrit·e"
                  : `Liste d'attente · position #${s.myBooking!.waitlistPos}`}
              </div>
              <a
                href={googleCalLink(s)}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-[10px] uppercase tracking-widest text-stone2-500 hover:text-brand-600 py-2 border border-stone2-200"
              >
                + Ajouter au calendrier Google
              </a>
              <button onClick={onCancel} className="btn-danger w-full text-sm">
                Annuler ma réservation
              </button>
            </div>
          ) : isLoggedIn ? (
            <button
              onClick={onBook}
              disabled={pending}
              className={`w-full ${full ? "btn-secondary" : "btn-primary"}`}
            >
              {full ? "Rejoindre la liste d'attente" : "Réserver ce cours"}
            </button>
          ) : (
            <a href="/login" className="btn-secondary block text-center w-full">
              Se connecter pour réserver
            </a>
          )}

          <p className="text-[10px] text-stone2-400 text-center">
            Annulation gratuite jusqu'à 2h avant le cours
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Booking modal ────────────────────────────────────────────────────────────

function BookingModal({ confirm, pending, onClose, onConfirm }: {
  confirm: BookConfirm; pending: boolean; onClose: () => void; onConfirm: () => void;
}) {
  const { session: s, mode } = confirm;

  return (
    <div className="fixed inset-0 z-50 bg-brand-600/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-cream-50 max-w-sm w-full border border-stone2-200 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-stone2-200" style={{ borderLeft: `4px solid ${s.classType.color}` }}>
          <p className="section-title">
            {new Date(s.startTime).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h2 className="font-serif text-2xl text-brand-600 mt-1">{s.classType.name}</h2>
          <p className="text-sm text-stone2-500 mt-0.5">
            {formatTime(s.startTime)} · {s.instructor.name} · {s.location.name}
          </p>
        </div>
        {mode === "no-credits" ? (
          <div className="p-5">
            <p className="font-medium text-brand-600 mb-2">Solde insuffisant</p>
            <p className="text-sm text-stone2-500 mb-5">
              Ce cours coûte <strong>{s.classType.creditCost} crédit{s.classType.creditCost > 1 ? "s" : ""}</strong>. Votre solde actuel ne permet pas de réserver.
            </p>
            <div className="flex gap-2">
              <Link href="/packs?from=schedule" className="btn-primary flex-1 text-center">Acheter des crédits</Link>
              <button onClick={onClose} className="btn-secondary">Fermer</button>
            </div>
          </div>
        ) : mode === "waitlist" ? (
          <div className="p-5">
            <p className="font-medium text-brand-600 mb-2">Cours complet — Liste d'attente</p>
            <p className="text-sm text-stone2-500 mb-5">
              {s.waitlistCount > 0 ? `${s.waitlistCount} personne${s.waitlistCount > 1 ? "s sont" : " est"} déjà en attente. ` : "Vous serez le·la premier·ère. "}
              Aucun crédit débité tant qu'aucune place ne se libère.
            </p>
            <div className="flex gap-2">
              <button onClick={onConfirm} disabled={pending} className="btn-primary flex-1">{pending ? "…" : "Rejoindre la liste"}</button>
              <button onClick={onClose} className="btn-secondary">Annuler</button>
            </div>
          </div>
        ) : (
          <div className="p-5">
            <div className="flex items-center justify-between bg-cream-100 border border-stone2-200 px-4 py-3 mb-4">
              <span className="text-sm text-stone2-600">Débit</span>
              <span className="font-serif text-xl text-brand-600">
                {s.classType.creditCost} crédit{s.classType.creditCost > 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-[11px] text-stone2-400 mb-5">Annulation gratuite jusqu'à 2h avant le cours.</p>
            <div className="flex gap-2">
              <button onClick={onConfirm} disabled={pending} className="btn-primary flex-1">{pending ? "…" : "Confirmer"}</button>
              <button onClick={onClose} className="btn-secondary">Annuler</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Cancel modal ─────────────────────────────────────────────────────────────

function CancelModal({ confirm, pending, onClose, onConfirm }: {
  confirm: CancelConfirm; pending: boolean; onClose: () => void; onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-brand-600/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-cream-50 max-w-sm w-full border border-stone2-200 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5">
          <p className="section-title">Annulation</p>
          <h2 className="font-serif text-2xl text-brand-600 mt-1 mb-3">Annuler {confirm.sessionName} ?</h2>
          <p className="text-sm text-stone2-500 mb-5">Si vous annulez plus de 2h avant le cours, le crédit est remboursé. En-deçà, un crédit reste retenu.</p>
          <div className="flex gap-2">
            <button onClick={onConfirm} disabled={pending} className="btn-danger flex-1">{pending ? "…" : "Confirmer l'annulation"}</button>
            <button onClick={onClose} className="btn-secondary">Garder ma place</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Session row (day view) ───────────────────────────────────────────────────

function SessionRow({ s, nowDate, isLoggedIn, pending, onOpen, onRequestBook, onRequestCancel }: {
  s: SessionItem; nowDate: Date; isLoggedIn: boolean; pending: boolean;
  onOpen: (s: SessionItem) => void;
  onRequestBook: (s: SessionItem) => void;
  onRequestCancel: (id: string, name: string) => void;
}) {
  const urgency = getUrgency(s, nowDate);
  const isMine = !!s.myBooking;
  const isPast = urgency === "past";

  return (
    <div
      className={`flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-cream-50 cursor-pointer ${isPast ? "opacity-50" : ""}`}
      onClick={() => onOpen(s)}
    >
      <div className="w-1 self-stretch shrink-0" style={{ background: s.classType.color, minHeight: "2.5rem" }} />
      <div className="w-20 shrink-0">
        <div className="font-serif text-xl text-brand-600">{formatTime(s.startTime)}</div>
        <div className="text-[10px] uppercase tracking-widest text-stone2-400">{s.classType.durationMin}min</div>
      </div>
      <div className="flex-1 min-w-[180px]">
        <div className="font-serif text-lg text-brand-600 flex items-center gap-2 flex-wrap">
          {s.classType.name}
          <UrgencyBadge urgency={urgency} waitlistCount={s.waitlistCount} />
        </div>
        <div className="text-sm text-stone2-600">{s.instructor.name}</div>
        <div className="text-xs text-stone2-400">{s.location.name}</div>
      </div>
      <div className="text-[10px] uppercase tracking-widest text-stone2-400 min-w-[80px] text-right shrink-0">
        {s.classType.creditCost} crédit{s.classType.creditCost > 1 ? "s" : ""}
      </div>
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        {isMine ? (
          <div className="flex items-center gap-2">
            <span className={`badge ${s.myBooking!.status === "CONFIRMED" ? "bg-brand-600 text-cream-50" : "bg-accent-100 text-brand-600"}`}>
              {s.myBooking!.status === "CONFIRMED" ? "Réservé" : `#${s.myBooking!.waitlistPos}`}
            </span>
            <button onClick={() => onRequestCancel(s.myBooking!.id, s.classType.name)} disabled={pending}
              className="text-[10px] uppercase tracking-widest text-stone2-400 hover:text-red-800">
              Annuler
            </button>
          </div>
        ) : isLoggedIn && !isPast ? (
          <button onClick={() => onRequestBook(s)} disabled={pending}
            className={urgency === "full" ? "btn-secondary text-sm py-2" : "btn-primary text-sm py-2"}>
            {urgency === "full" ? "Attente" : "Réserver"}
          </button>
        ) : !isLoggedIn ? (
          <a href="/login" className="btn-secondary text-sm py-2">Se connecter</a>
        ) : null}
      </div>
    </div>
  );
}

// ─── Session card (week list view) ───────────────────────────────────────────

function SessionCard({ s, nowDate, isLoggedIn, pending, onOpen, onRequestBook, onRequestCancel }: {
  s: SessionItem; nowDate: Date; isLoggedIn: boolean; pending: boolean;
  onOpen: (s: SessionItem) => void;
  onRequestBook: (s: SessionItem) => void;
  onRequestCancel: (id: string, name: string) => void;
}) {
  const urgency = getUrgency(s, nowDate);
  const full = s.confirmedCount >= s.capacity;
  const spotsLeft = Math.max(0, s.capacity - s.confirmedCount);
  const isMine = !!s.myBooking;
  const isPast = urgency === "past";

  return (
    <div
      className={`card flex flex-col gap-3 cursor-pointer hover:border-stone2-300 transition-colors ${isPast ? "opacity-50" : ""}`}
      style={{ borderLeft: `3px solid ${s.classType.color}` }}
      onClick={() => onOpen(s)}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="section-title">{formatTime(s.startTime)} — {formatTime(s.endTime)}</p>
          <h3 className="font-serif text-xl text-brand-600">{s.classType.name}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="h-4 w-4 rounded-full bg-stone2-200 flex items-center justify-center text-[8px] text-brand-600 font-semibold">
              {s.instructor.firstName[0]}
            </div>
            <p className="text-sm text-stone2-600">{s.instructor.name}</p>
          </div>
          <p className="text-xs text-stone2-400">{s.location.name}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="badge bg-cream-100 text-stone2-600 border border-stone2-200">
            {s.classType.creditCost} cr.
          </span>
          <UrgencyBadge urgency={urgency} waitlistCount={s.waitlistCount} />
        </div>
      </div>

      {/* Capacity bar */}
      <div className="h-1 bg-stone2-100 overflow-hidden">
        <div
          className="h-full"
          style={{
            width: `${Math.min(100, Math.round((s.confirmedCount / s.capacity) * 100))}%`,
            backgroundColor: full ? "#991b1b" : urgency === "last-spots" ? "#d97706" : s.classType.color,
          }}
        />
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        {isMine ? (
          <div className="flex flex-col gap-1">
            <span className={`badge ${s.myBooking!.status === "CONFIRMED" ? "bg-brand-600 text-cream-50" : "bg-accent-100 text-brand-600"}`}>
              {s.myBooking!.status === "CONFIRMED" ? "✓ Réservé" : `Liste d'attente · #${s.myBooking!.waitlistPos}`}
            </span>
            <button onClick={() => onRequestCancel(s.myBooking!.id, s.classType.name)} disabled={pending}
              className="text-[10px] uppercase tracking-widest text-stone2-400 hover:text-red-800 mt-1 self-start">
              Annuler
            </button>
          </div>
        ) : isLoggedIn && !isPast ? (
          <button onClick={() => onRequestBook(s)} disabled={pending}
            className={`w-full ${full ? "btn-secondary" : "btn-primary"}`}>
            {full ? "Liste d'attente" : "Réserver"}
          </button>
        ) : !isLoggedIn ? (
          <a href="/login" className="btn-secondary text-center block w-full">Se connecter</a>
        ) : null}
      </div>
    </div>
  );
}
