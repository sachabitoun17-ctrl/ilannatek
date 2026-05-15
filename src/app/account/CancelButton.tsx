"use client";

import { useState, useTransition } from "react";
import { cancelAction } from "../schedule/actions";

export default function CancelButton({ bookingId }: { bookingId: string }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const handleCancel = () => {
    startTransition(async () => {
      await cancelAction(bookingId);
      setConfirming(false);
    });
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleCancel}
          disabled={pending}
          className="btn-danger text-sm"
        >
          {pending ? "..." : "Confirmer l'annulation"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="btn-secondary text-sm"
        >
          Garder
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      disabled={pending}
      className="btn-ghost text-red-600"
    >
      Annuler
    </button>
  );
}
