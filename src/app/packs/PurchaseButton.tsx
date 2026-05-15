"use client";

import { useState, useTransition } from "react";
import { purchasePackAction, purchaseSubscriptionAction } from "./actions";

export default function PurchaseButton({
  planId,
  kind,
}: {
  planId: string;
  kind: "pack" | "subscription";
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const handle = () => {
    const action = kind === "pack" ? purchasePackAction : purchaseSubscriptionAction;
    startTransition(async () => {
      const result = await action(planId);
      setMsg(result.ok ? "Achat effectué ✓" : result.error);
      setTimeout(() => setMsg(null), 4000);
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <button onClick={handle} disabled={pending} className="btn-primary">
        {pending ? "Achat..." : "Acheter (paiement simulé)"}
      </button>
      {msg && <p className="text-xs text-gray-600">{msg}</p>}
    </div>
  );
}
