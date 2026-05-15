"use client";

import { useState } from "react";

export default function DeleteForm({
  action,
  id,
  confirmMsg = "Supprimer ?",
  label = "Supprimer",
}: {
  action: (id: string) => void | Promise<void>;
  id: string;
  confirmMsg?: string;
  label?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <form
          action={async () => {
            await action(id);
            setConfirming(false);
          }}
        >
          <button className="text-red-600 hover:underline text-xs font-medium">
            Confirmer
          </button>
        </form>
        <button
          onClick={() => setConfirming(false)}
          className="text-gray-500 hover:underline text-xs"
        >
          Annuler
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-red-600 hover:underline text-xs"
    >
      {label}
    </button>
  );
}
