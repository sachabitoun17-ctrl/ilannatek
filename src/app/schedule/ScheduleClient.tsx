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
}: {
  days: Day[];
  userCredits: number | null;
  isLoggedIn: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    text: string;
    kind: "ok" | "err";
  } | null>(null);

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
    if (!confirm("Annuler cette réservation ?")) return;
    startTransition(async () => {
      const result = await cancelAction(bookingId);
      setMessage(
        result.ok
          ? { text: "Réservation annulée", kind: "ok" }
          : { text: result.error ?? "Erreur", kind: "err" }
      );
      setTimeout(() => setMessage(null), 4000);
    });
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`rounded-md px-4 py-2 text-sm ${
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
          <h2 className="font-semibold text-lg capitalize mb-3 text-gray-800">
            {formatDate(day.date)}
          </h2>
          {day.sessions.length === 0 ? (
            <p className="text-sm text-gray-400 italic px-4 py-2">
              Aucun cours ce jour
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {day.sessions.map((s) => {
                const full = s.confirmedCount >= s.capacity;
                const spotsLeft = Math.max(0, s.capacity - s.confirmedCount);
                const isMine = !!s.myBooking;
                return (
                  <div
                    key={s.id}
                    className="card flex flex-col gap-2"
                    style={{ borderLeftWidth: 4, borderLeftColor: s.classType.color }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          {formatTime(s.startTime)} — {formatTime(s.endTime)}
                        </p>
                        <h3 className="font-semibold text-gray-900">
                          {s.classType.name}
                        </h3>
                        <p className="text-sm text-gray-600">{s.instructor}</p>
                        <p className="text-xs text-gray-500">{s.location}</p>
                      </div>
                      <span className="badge bg-gray-100 text-gray-700">
                        {s.classType.creditCost} crédit
                        {s.classType.creditCost > 1 ? "s" : ""}
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
                          onClick={() => handleCancel(s.myBooking!.id)}
                          disabled={pending}
                          className="btn-ghost text-red-600 text-xs"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : isLoggedIn ? (
                      <button
                        onClick={() => handleBook(s.id)}
                        disabled={pending}
                        className={full ? "btn-secondary" : "btn-primary"}
                      >
                        {full ? "Rejoindre la liste d'attente" : "Réserver"}
                      </button>
                    ) : (
                      <a href="/login" className="btn-secondary text-center">
                        Se connecter pour réserver
                      </a>
                    )}
                  </div>
                );
              })}
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
