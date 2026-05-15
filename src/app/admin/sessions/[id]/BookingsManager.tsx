"use client";

import { useState, useTransition } from "react";
import { adminCancelBookingAction, adminMarkAttendanceAction } from "./actions";

type Booking = {
  id: string;
  userName: string;
  email: string;
  status: string;
  waitlistPos: number | null;
  checkedIn: boolean;
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  CONFIRMED: { label: "Confirmé", bg: "bg-green-100", text: "text-green-800" },
  WAITLIST: { label: "En attente", bg: "bg-accent-100", text: "text-accent-600" },
  ATTENDED: { label: "Présent", bg: "bg-brand-600", text: "text-cream-50" },
  NO_SHOW: { label: "Absent", bg: "bg-red-100", text: "text-red-800" },
  CANCELLED: { label: "Annulé", bg: "bg-stone2-100", text: "text-stone2-500" },
  LATE_CANCEL: { label: "Annulation tardive", bg: "bg-orange-100", text: "text-orange-800" },
};

export default function BookingsManager({
  bookings,
  capacity,
}: {
  bookings: Booking[];
  capacity: number;
}) {
  const [pending, startTransition] = useTransition();
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; kind: "ok" | "err" } | null>(null);

  const attended = bookings.filter((b) => b.status === "ATTENDED").length;
  const waitlist = bookings.filter((b) => b.status === "WAITLIST");
  const cancelled = bookings.filter((b) => ["CANCELLED", "LATE_CANCEL"].includes(b.status));
  const active = bookings.filter((b) => ["CONFIRMED", "ATTENDED", "NO_SHOW"].includes(b.status));
  const fillPct = Math.round((active.length / Math.max(1, capacity)) * 100);

  const mark = (id: string, status: "ATTENDED" | "NO_SHOW") => {
    startTransition(async () => {
      await adminMarkAttendanceAction(id, status);
      setMessage({ text: status === "ATTENDED" ? "Présence marquée" : "Absence marquée", kind: "ok" });
      setTimeout(() => setMessage(null), 3000);
    });
  };

  const cancel = (id: string) => {
    startTransition(async () => {
      await adminCancelBookingAction(id);
      setCancelingId(null);
      setMessage({ text: "Réservation annulée", kind: "ok" });
      setTimeout(() => setMessage(null), 3000);
    });
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-stone2-200 p-5">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
          <div className="flex gap-8">
            <Stat label="Inscrits" value={`${active.length}/${capacity}`} />
            <Stat label="Présents" value={attended.toString()} accent />
            <Stat label="Attente" value={waitlist.length.toString()} />
            <Stat label="Annulés" value={cancelled.length.toString()} />
          </div>
          <p className="font-serif text-4xl text-brand-600">{fillPct}%</p>
        </div>
        <div className="h-2 bg-stone2-100 overflow-hidden">
          <div className="h-full" style={{ width: `${Math.min(100, fillPct)}%`, backgroundColor: fillPct >= 100 ? "#991b1b" : fillPct >= 80 ? "#d97706" : "#1C1C1A" }} />
        </div>
        {attended > 0 && (
          <div className="h-1.5 bg-stone2-100 overflow-hidden mt-1">
            <div className="h-full bg-green-600 opacity-70" style={{ width: `${Math.min(100, Math.round((attended / capacity) * 100))}%` }} />
          </div>
        )}
      </div>

      {message && (
        <p className={`text-sm px-4 py-2 border ${message.kind === "ok" ? "bg-cream-100 border-brand-600 text-brand-600" : "bg-red-50 border-red-600 text-red-800"}`}>
          {message.text}
        </p>
      )}

      {active.length > 0 && (
        <div>
          <p className="section-title mb-2">Roster — inscrits ({active.length})</p>
          <div className="bg-white border border-stone2-200 divide-y divide-stone2-100">
            {active.map((b) => {
              const cfg = STATUS_CONFIG[b.status];
              const isConfirming = cancelingId === b.id;
              return (
                <div key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <div className="h-8 w-8 rounded-full bg-stone2-200 flex items-center justify-center text-xs font-semibold text-brand-600 shrink-0">
                    {b.userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <p className="font-medium text-brand-600 text-sm">{b.userName}</p>
                    <p className="text-xs text-stone2-500">{b.email}</p>
                  </div>
                  {b.checkedIn && <span className="text-[10px] uppercase tracking-widest text-green-700 font-medium">QR Pointé</span>}
                  <span className={`badge text-[10px] ${cfg?.bg} ${cfg?.text}`}>{cfg?.label ?? b.status}</span>
                  <div className="flex items-center gap-2 shrink-0 ml-auto">
                    {b.status === "CONFIRMED" && (
                      <>
                        <button onClick={() => mark(b.id, "ATTENDED")} disabled={pending} className="px-3 py-1 text-[10px] uppercase tracking-widest bg-brand-600 text-cream-50 hover:bg-brand-700 disabled:opacity-50">Présent</button>
                        <button onClick={() => mark(b.id, "NO_SHOW")} disabled={pending} className="px-3 py-1 text-[10px] uppercase tracking-widest bg-red-100 text-red-800 hover:bg-red-200 disabled:opacity-50">Absent</button>
                      </>
                    )}
                    {b.status === "ATTENDED" && <button onClick={() => mark(b.id, "NO_SHOW")} disabled={pending} className="text-[10px] uppercase tracking-widest text-stone2-400 hover:text-red-800">→ Absent</button>}
                    {b.status === "NO_SHOW" && <button onClick={() => mark(b.id, "ATTENDED")} disabled={pending} className="text-[10px] uppercase tracking-widest text-stone2-400 hover:text-green-800">→ Présent</button>}
                    {b.status === "CONFIRMED" && (isConfirming ? (
                      <>
                        <button onClick={() => cancel(b.id)} disabled={pending} className="text-[10px] uppercase tracking-widest text-red-800 font-semibold">{pending ? "…" : "Confirmer"}</button>
                        <button onClick={() => setCancelingId(null)} disabled={pending} className="text-[10px] uppercase tracking-widest text-stone2-400">Non</button>
                      </>
                    ) : (
                      <button onClick={() => setCancelingId(b.id)} disabled={pending} className="text-[10px] text-stone2-400 hover:text-red-800 uppercase tracking-widest">Annuler</button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {waitlist.length > 0 && (
        <div>
          <p className="section-title mb-2">Liste d'attente ({waitlist.length})</p>
          <div className="bg-white border border-stone2-200 divide-y divide-stone2-100">
            {waitlist.map((b) => {
              const isConfirming = cancelingId === b.id;
              return (
                <div key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <div className="h-7 w-7 flex items-center justify-center border border-stone2-300 text-xs text-stone2-500 shrink-0">#{b.waitlistPos}</div>
                  <div className="flex-1 min-w-[160px]">
                    <p className="font-medium text-brand-600 text-sm">{b.userName}</p>
                    <p className="text-xs text-stone2-500">{b.email}</p>
                  </div>
                  {isConfirming ? (
                    <>
                      <button onClick={() => cancel(b.id)} disabled={pending} className="text-[10px] uppercase tracking-widest text-red-800 font-semibold ml-auto">{pending ? "…" : "Confirmer retrait"}</button>
                      <button onClick={() => setCancelingId(null)} disabled={pending} className="text-[10px] uppercase tracking-widest text-stone2-400">Non</button>
                    </>
                  ) : (
                    <button onClick={() => setCancelingId(b.id)} disabled={pending} className="text-[10px] text-stone2-400 hover:text-red-800 uppercase tracking-widest ml-auto">Retirer</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {cancelled.length > 0 && (
        <details>
          <summary className="section-title cursor-pointer hover:text-brand-600">Annulations ({cancelled.length})</summary>
          <div className="bg-white border border-stone2-200 divide-y divide-stone2-100 mt-2 opacity-70">
            {cancelled.map((b) => {
              const cfg = STATUS_CONFIG[b.status];
              return (
                <div key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-[160px]">
                    <p className="font-medium text-stone2-600 text-sm">{b.userName}</p>
                    <p className="text-xs text-stone2-400">{b.email}</p>
                  </div>
                  <span className={`badge text-[10px] ${cfg?.bg} ${cfg?.text}`}>{cfg?.label ?? b.status}</span>
                </div>
              );
            })}
          </div>
        </details>
      )}

      {bookings.length === 0 && (
        <div className="text-center py-12">
          <p className="font-serif text-2xl text-stone2-400">Aucune réservation</p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-stone2-400">{label}</p>
      <p className={`font-serif text-2xl ${accent ? "text-green-700" : "text-brand-600"}`}>{value}</p>
    </div>
  );
}
