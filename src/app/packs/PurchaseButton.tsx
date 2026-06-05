"use client";

import { useState, useTransition } from "react";
import { checkoutPlanAction } from "./actions";

export default function PurchaseButton({
  planId,
  cta = "Acheter",
}: {
  planId: string;
  cta?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [promo, setPromo] = useState("");
  const [showPromo, setShowPromo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(fd) => {
        setError(null);
        startTransition(async () => {
          const result = await checkoutPlanAction(fd);
          if (result && !result.ok) {
            setError(result.error);
          }
        });
      }}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="planId" value={planId} />
      {showPromo && (
        <input
          name="promoCode"
          value={promo}
          onChange={(e) => setPromo(e.target.value)}
          placeholder="Code promo"
          className="input"
        />
      )}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Redirection..." : cta}
      </button>
      <button
        type="button"
        onClick={() => setShowPromo((v) => !v)}
        className="text-xs text-stone2-500 hover:text-brand-600"
      >
        {showPromo ? "Masquer le code promo" : "J'ai un code promo"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
