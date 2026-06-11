"use client";

import { useState, useTransition } from "react";
import { requestSubAction, cancelSubRequestAction } from "./actions";

type Session = {
  id: string;
  startTime: Date;
  classType: { name: string };
  location: { name: string };
  subRequest: {
    status: string;
    sub: { firstName: string; lastName: string } | null;
  } | null;
  _count: { bookings: number };
};

export default function SubRequestClient({ sessions }: { sessions: Session[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function handleRequest(sessionId: string) {
    startTransition(async () => {
      const res = await requestSubAction(sessionId, reason.trim() || null);
      if (res.ok) {
        setExpanded(null);
        setReason("");
        setFeedback((f) => ({ ...f, [sessionId]: "Demande envoyée — l'admin va assigner un remplaçant." }));
      } else {
        setFeedback((f) => ({ ...f, [sessionId]: res.error }));
      }
    });
  }

  function handleCancel(sessionId: string) {
    startTransition(async () => {
      const res = await cancelSubRequestAction(sessionId);
      if (res.ok) {
        setFeedback((f) => ({ ...f, [sessionId]: "Demande annulée." }));
      } else {
        setFeedback((f) => ({ ...f, [sessionId]: res.error }));
      }
    });
  }

  if (sessions.length === 0) {
    return (
      <p className="text-stone2-500 text-sm border border-stone2-200 p-8 text-center">
        Aucune séance à venir.
      </p>
    );
  }

  return (
    <div className="divide-y divide-stone2-100 border border-stone2-200">
      {sessions.map((s) => {
        const req = s.subRequest;
        const isOpen = req?.status === "OPEN";
        const isAssigned = req?.status === "ASSIGNED";

        return (
          <div key={s.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-brand-600">{s.classType.name}</p>
                <p className="text-sm text-stone2-500 mt-0.5">
                  {s.startTime.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                  {" · "}
                  {s.startTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  {" · "}
                  {s.location.name}
                  {" · "}
                  <span className="text-stone2-400">{s._count.bookings} inscrits</span>
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isAssigned && (
                  <span className="text-[10px] uppercase tracking-widest px-2 py-1 bg-green-50 text-green-700 border border-green-200">
                    Remplaçant : {req!.sub?.firstName} {req!.sub?.lastName}
                  </span>
                )}
                {isOpen && (
                  <span className="text-[10px] uppercase tracking-widest px-2 py-1 bg-accent-50 text-accent-700 border border-accent-200">
                    En attente
                  </span>
                )}
                {!req || req.status === "CANCELLED" ? (
                  <button
                    onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                    className="text-[11px] uppercase tracking-[0.15em] border border-stone2-300 px-3 py-1.5 text-stone2-600 hover:border-brand-600 hover:text-brand-600 transition-colors"
                  >
                    Demander un rempla
                  </button>
                ) : isOpen ? (
                  <button
                    onClick={() => handleCancel(s.id)}
                    disabled={pending}
                    className="text-[11px] uppercase tracking-[0.15em] border border-stone2-300 px-3 py-1.5 text-stone2-500 hover:border-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                  >
                    Annuler la demande
                  </button>
                ) : null}
              </div>
            </div>

            {feedback[s.id] && (
              <p className="mt-2 text-sm text-accent-700 bg-accent-50 border border-accent-200 px-3 py-2">
                {feedback[s.id]}
              </p>
            )}

            {expanded === s.id && (
              <div className="mt-4 border-t border-stone2-100 pt-4 space-y-3">
                <label className="block">
                  <span className="text-[11px] uppercase tracking-[0.15em] text-stone2-500">
                    Motif (optionnel)
                  </span>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ex : congé maladie, empêchement familial…"
                    rows={2}
                    maxLength={300}
                    className="mt-1 w-full border border-stone2-300 px-3 py-2 text-sm focus:outline-none focus:border-brand-600 resize-none"
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRequest(s.id)}
                    disabled={pending}
                    className="bg-brand-600 text-cream-50 px-5 py-2 text-[11px] uppercase tracking-[0.18em] hover:bg-brand-700 transition-colors disabled:opacity-50"
                  >
                    Envoyer la demande
                  </button>
                  <button
                    onClick={() => { setExpanded(null); setReason(""); }}
                    className="border border-stone2-300 px-5 py-2 text-[11px] uppercase tracking-[0.18em] text-stone2-600 hover:border-stone2-500 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
