"use client";

import { useTransition } from "react";
import { cancelAction } from "../schedule/actions";

export default function CancelButton({ bookingId }: { bookingId: string }) {
  const [pending, startTransition] = useTransition();
  const handle = () => {
    if (!confirm("Annuler cette réservation ?")) return;
    startTransition(async () => {
      await cancelAction(bookingId);
    });
  };
  return (
    <button onClick={handle} disabled={pending} className="btn-ghost text-red-600">
      {pending ? "..." : "Annuler"}
    </button>
  );
}
