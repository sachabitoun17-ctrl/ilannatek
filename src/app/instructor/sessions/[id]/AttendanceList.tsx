"use client";

import { useState, useTransition } from "react";
import { markAttendanceAction } from "./actions";

type Row = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  waitlistPos: number | null;
};

export default function AttendanceList({ bookings }: { bookings: Row[] }) {
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState("");

  const filtered = bookings.filter((b) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      b.firstName.toLowerCase().includes(q) ||
      b.lastName.toLowerCase().includes(q) ||
      b.email.toLowerCase().includes(q)
    );
  });

  const update = (bookingId: string, status: "ATTENDED" | "NO_SHOW" | "CONFIRMED") => {
    startTransition(async () => {
      await markAttendanceAction(bookingId, status);
    });
  };

  return (
    <div className="card space-y-3">
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filtrer par nom ou email"
        className="input"
      />
      <div className="divide-y -mx-5">
        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">Aucun inscrit</p>
        )}
        {filtered.map((b) => (
          <div
            key={b.id}
            className="flex flex-wrap items-center gap-3 px-5 py-3"
          >
            <div className="flex-1 min-w-[180px]">
              <p className="font-medium">
                {b.firstName} {b.lastName}
              </p>
              <p className="text-xs text-gray-500">{b.email}</p>
            </div>
            <span
              className={`badge ${
                b.status === "ATTENDED"
                  ? "bg-green-100 text-green-700"
                  : b.status === "NO_SHOW"
                  ? "bg-amber-100 text-amber-700"
                  : b.status === "WAITLIST"
                  ? "bg-gray-100 text-gray-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {b.status === "WAITLIST" ? `Attente #${b.waitlistPos}` : b.status}
            </span>
            {b.status !== "WAITLIST" && (
              <div className="flex gap-1">
                <button
                  onClick={() => update(b.id, "ATTENDED")}
                  disabled={pending || b.status === "ATTENDED"}
                  className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
                >
                  Présent
                </button>
                <button
                  onClick={() => update(b.id, "NO_SHOW")}
                  disabled={pending || b.status === "NO_SHOW"}
                  className="text-xs px-2 py-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                >
                  Absent
                </button>
                {(b.status === "ATTENDED" || b.status === "NO_SHOW") && (
                  <button
                    onClick={() => update(b.id, "CONFIRMED")}
                    disabled={pending}
                    className="text-xs px-2 py-1 rounded text-gray-600 hover:bg-gray-100"
                  >
                    Annuler
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
