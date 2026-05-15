"use client";

import { useTransition } from "react";
import { adminCancelBookingAction, adminMarkAttendanceAction } from "./actions";

type Booking = {
  id: string;
  userName: string;
  email: string;
  status: string;
  waitlistPos: number | null;
};

export default function BookingsManager({ bookings }: { bookings: Booking[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-gray-500">
          <tr>
            <th className="py-2">Membre</th>
            <th>Statut</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {bookings.length === 0 && (
            <tr>
              <td colSpan={3} className="text-center py-4 text-gray-400">
                Aucune réservation
              </td>
            </tr>
          )}
          {bookings.map((b) => (
            <tr key={b.id}>
              <td className="py-2">
                <div className="font-medium">{b.userName}</div>
                <div className="text-xs text-gray-500">{b.email}</div>
              </td>
              <td>
                <span
                  className={`badge ${
                    b.status === "CONFIRMED"
                      ? "bg-green-100 text-green-700"
                      : b.status === "WAITLIST"
                      ? "bg-amber-100 text-amber-700"
                      : b.status === "ATTENDED"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {b.status === "WAITLIST"
                    ? `Liste #${b.waitlistPos ?? "?"}`
                    : b.status}
                </span>
              </td>
              <td className="text-right space-x-2">
                {b.status === "CONFIRMED" && (
                  <>
                    <button
                      onClick={() =>
                        startTransition(async () => {
                          await adminMarkAttendanceAction(b.id, "ATTENDED");
                        })
                      }
                      disabled={pending}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Présent
                    </button>
                    <button
                      onClick={() =>
                        startTransition(async () => {
                          await adminMarkAttendanceAction(b.id, "NO_SHOW");
                        })
                      }
                      disabled={pending}
                      className="text-xs text-amber-600 hover:underline"
                    >
                      Absent
                    </button>
                  </>
                )}
                {["CONFIRMED", "WAITLIST"].includes(b.status) && (
                  <button
                    onClick={() => {
                      if (!confirm("Annuler cette réservation ?")) return;
                      startTransition(async () => {
                        await adminCancelBookingAction(b.id);
                      });
                    }}
                    disabled={pending}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Annuler
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
