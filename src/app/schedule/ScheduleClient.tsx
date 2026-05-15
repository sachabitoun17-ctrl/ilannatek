"use client";

import { useState, useTransition } from "react";
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

export default function ScheduleClient({
  days,
  userCredits,
  isLoggedIn,
  view,
}: {
  days: Day[];
  userCredits: number | null;
  isLoggedIn: boolean;
  view: "day" | "week";
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; kind: "ok" | "err" } | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const handleBook = (sessionId: string) => {
    startTransition(async () => {
      const result = await bookAction(sessionId);
      if (result.ok) {
        setMessage({
          text:
            result.status === "CONFIRMED"
              ? "Cours réservé ✓"
              : `Inscrit sur liste d'attente (position ${result.position})`,
          kind: "ok",
        });
      } else {
        setMessage({ text: result.error, kind: "err" });
      }
      setTimeout(() => setMessage(null), 4000);
    });
  };

  const handleCancel = (bookingId: string) => {
    startTransition(async () => {
      const result = await cancelAction(bookingId);
      setCancelingId(null);
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
          className={`fixed bottom-4 right-4 z-50 rounded-md px-4 py-2 text-sm ${
            message.kind === "ok"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {days.map((day) => (
        <div key={day.date}>
          {view === "week" && (
            <h2 className="font-semibold text-lg capitalize mb-4 text-gray-800">
              {formatDate(day.date)}
            </h2>
          )}
          {day.sessions.length === 0 ? (
            <p className="text-sm text-gray-400 italic px-4 py-12 text-center">
              Aucun cours ce jour
            </p>
          ) : view === "day" ? (
            <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
              {day.sessions.map((s) => (
                <SessionRow
                  key={s.id}
                  s={s}
                  isLoggedIn={isLoggedIn}
                  pending={pending}
                  cancelingId={cancelingId}
                  onBook={handleBook}
                  onCancelRequest={setCancelingId}
                  onCancelConfirm={handleCancel}
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
                  cancelingId={cancelingId}
                  onBook={handleBook}
                  onCancelRequest={setCancelingId}
                  onCancelConfirm={handleCancel}
                />
              ))}
            </div>
          )}
        </div>
      ))}
      {isLoggedIn && userCredits !== null && (
        <p className="text-sm text-gray-500 text-center pt-4">
          Solde actuel : <strong>{userCredits} crédits</strong>
        </p>
      )}
    </div>
  );
}

function SessionRow({
  s,
  isLoggedIn,
  pending,
  cancelingId,
  onBook,
  onCancelRequest,
  onCancelConfirm,
}: {
  s: SessionItem;
  isLoggedIn: boolean;
  pending: boolean;
  cancelingId: string | null;
  onBook: (id: string) => void;
  onCancelRequest: (id: string | null) => void;
  onCancelConfirm: (id: string) => void;
}) {
  const full = s.confirmedCount >= s.capacity;
  const spotsLeft = Math.max(0, s.capacity - s.confirmedCount);
  const isMine = !!s.myBooking;
  const isConfirming = isMine && cancelingId === s.myBooking!.id;

  return (
    <div className="flex flex-wrap items-center gap-4 px-5 py-4">
      <div
        className="w-1 self-stretch rounded-full shrink-0"
        style={{ background: s.classType.color, minHeight: "2.5rem" }}
      />
      <div className="w-24 shrink-0">
        <div className="font-semibold text-gray-900">{formatTime(s.startTime)}</div>
        <div className="text-xs text-gray-500">{s.classType.durationMin}min</div>
      </div>
      <div className="flex-1 min-w-[180px]">
        <div className="font-semibold text-gray-900">{s.classType.name}</div>
        <div className="text-sm text-gray-600">
          {s.instructor} · {s.location}
        </div>
      </div>
      <div className="text-xs text-gray-500 min-w-[120px]">
        {full ? (
          <span className="text-red-600 font-medium">
            Complet · {s.waitlistCount} en attente
          </span>
        ) : (
          <span>
            {spotsLeft} place{spotsLeft > 1 ? "s" : ""}
          </span>
        )}
        <div>
          {s.classType.creditCost} crédit{s.classType.creditCost > 1 ? "s" : ""}
        </div>
      </div>
      <div className="shrink-0">
        {isMine ? (
          isConfirming ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onCancelConfirm(s.myBooking!.id)}
                disabled={pending}
                className="text-xs px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                Confirmer l&apos;annulation
              </button>
              <button
                onClick={() => onCancelRequest(null)}
                disabled={pending}
                className="text-xs px-3 py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
              >
                Garder
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span
                className={`badge ${
                  s.myBooking!.status === "CONFIRMED"
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {s.myBooking!.status === "CONFIRMED"
                  ? "✓ Réservé"
                  : `#${s.myBooking!.waitlistPos}`}
              </span>
              <button
                onClick={() => onCancelRequest(s.myBooking!.id)}
                disabled={pending}
                className="text-xs text-red-500 hover:text-red-700 hover:underline transition-colors"
              >
                Annuler
              </button>
            </div>
          )
        ) : isLoggedIn ? (
          <button
            onClick={() => onBook(s.id)}
            disabled={pending}
            className={full ? "btn-secondary text-sm px-4 py-2" : "btn-primary text-sm px-4 py-2"}
          >
            {full ? "Liste d'attente" : "Réserver"}
          </button>
        ) : (
          <a href="/login" className="btn-secondary text-sm px-4 py-2">
            Se connecter
          </a>
        )}
      </div>
    </div>
  );
}

function SessionCard({
  s,
  isLoggedIn,
  pending,
  cancelingId,
  onBook,
  onCancelRequest,
  onCancelConfirm,
}: {
  s: SessionItem;
  isLoggedIn: boolean;
  pending: boolean;
  cancelingId: string | null;
  onBook: (id: string) => void;
  onCancelRequest: (id: string | null) => void;
  onCancelConfirm: (id: string) => void;
}) {
  const full = s.confirmedCount >= s.capacity;
  const spotsLeft = Math.max(0, s.capacity - s.confirmedCount);
  const isMine = !!s.myBooking;
  const isConfirming = isMine && cancelingId === s.myBooking!.id;

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
          <h3 className="font-semibold text-gray-900">{s.classType.name}</h3>
          <p className="text-sm text-gray-600">{s.instructor}</p>
          <p className="text-xs text-gray-500">{s.location}</p>
        </div>
        <span className="badge bg-gray-100 text-gray-600">
          {s.classType.creditCost} cr.
        </span>
      </div>
      <div className="text-xs text-gray-500">
        {full ? (
          <span className="text-red-600 font-medium">
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
        isConfirming ? (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => onCancelConfirm(s.myBooking!.id)}
              disabled={pending}
              className="btn-danger w-full text-sm"
            >
              Confirmer l&apos;annulation
            </button>
            <button
              onClick={() => onCancelRequest(null)}
              disabled={pending}
              className="btn-secondary w-full text-sm"
            >
              Garder ma place
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <span
              className={`badge ${
                s.myBooking!.status === "CONFIRMED"
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {s.myBooking!.status === "CONFIRMED"
                ? "✓ Réservé"
                : `Liste d'attente · #${s.myBooking!.waitlistPos}`}
            </span>
            <button
              onClick={() => onCancelRequest(s.myBooking!.id)}
              disabled={pending}
              className="text-xs text-red-500 hover:text-red-700 hover:underline transition-colors mt-1"
            >
              Annuler ma réservation
            </button>
          </div>
        )
      ) : isLoggedIn ? (
        <button
          onClick={() => onBook(s.id)}
          disabled={pending}
          className={full ? "btn-secondary w-full" : "btn-primary w-full"}
        >
          {full ? "Rejoindre la liste d'attente" : "Réserver"}
        </button>
      ) : (
        <a href="/login" className="btn-secondary text-center w-full">
          Se connecter pour réserver
        </a>
      )}
    </div>
  );
}
