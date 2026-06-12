"use client";

import { useState, useTransition } from "react";
import { sendReengagementEmailAction } from "./actions";

type Tier = "HOT" | "WARM" | "COLD";

export function RelancerButton({
  userId,
  firstName,
  email,
  tier,
}: {
  userId: string;
  firstName: string;
  email: string;
  tier: Tier;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return <span className="text-xs text-green-600 font-medium">Envoyé ✓</span>;
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const r = await sendReengagementEmailAction(userId, firstName, email, tier);
            if (r.ok) setDone(true);
            else setError(r.error ?? "Erreur");
          });
        }}
        className="text-xs text-accent-600 hover:text-accent-700 hover:underline disabled:opacity-50 font-medium whitespace-nowrap"
      >
        {pending ? "Envoi…" : "Relancer →"}
      </button>
      {error && <span className="text-[10px] text-red-500">{error}</span>}
    </div>
  );
}
