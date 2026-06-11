"use client";

import { useState, useTransition } from "react";
import { assignSubAction } from "./actions";

type Instructor = { id: string; firstName: string; lastName: string };

export default function AssignSubClient({
  sessionId,
  instructors,
}: {
  sessionId: string;
  instructors: Instructor[];
}) {
  const [subId, setSubId] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleAssign() {
    if (!subId) return;
    startTransition(async () => {
      const res = await assignSubAction(sessionId, subId);
      if (res.ok) {
        setDone(true);
        setFeedback("Remplaçant assigné — emails envoyés.");
      } else {
        setFeedback(res.error);
      }
    });
  }

  if (done) {
    return (
      <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 shrink-0">
        {feedback}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 shrink-0 min-w-[260px]">
      <select
        value={subId}
        onChange={(e) => setSubId(e.target.value)}
        className="border border-stone2-300 px-3 py-2 text-sm focus:outline-none focus:border-brand-600 bg-white"
      >
        <option value="">Choisir un remplaçant…</option>
        {instructors.map((i) => (
          <option key={i.id} value={i.id}>
            {i.firstName} {i.lastName}
          </option>
        ))}
      </select>
      <button
        onClick={handleAssign}
        disabled={!subId || pending}
        className="bg-brand-600 text-cream-50 px-4 py-2 text-[11px] uppercase tracking-[0.18em] hover:bg-brand-700 transition-colors disabled:opacity-40"
      >
        Assigner & notifier
      </button>
      {feedback && (
        <p className="text-xs text-red-600">{feedback}</p>
      )}
    </div>
  );
}
