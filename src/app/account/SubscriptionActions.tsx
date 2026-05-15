"use client";

import { useTransition } from "react";
import { freezeSubscriptionAction, unfreezeSubscriptionAction } from "./actions";

export function FreezeButton({ subscriptionId }: { subscriptionId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      className="btn-secondary text-xs"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await freezeSubscriptionAction(subscriptionId);
        })
      }
    >
      {pending ? "..." : "Mettre en pause"}
    </button>
  );
}

export function UnfreezeButton({ subscriptionId }: { subscriptionId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      className="btn-primary text-xs"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await unfreezeSubscriptionAction(subscriptionId);
        })
      }
    >
      {pending ? "..." : "Reprendre"}
    </button>
  );
}
