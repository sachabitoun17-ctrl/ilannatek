"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { bookAction } from "./actions";

type PourVousSession = {
  id: string;
  startTime: string;
  classTypeName: string;
  classTypeColor: string;
  instructorFirstName: string;
  myBooking: { id: string; status: string; waitlistPos: number | null } | null;
};

export default function PourVousStrip({
  sessions,
  labels,
  userCredits,
}: {
  sessions: PourVousSession[];
  labels: string[];
  userCredits: number;
}) {
  return (
    <div className="border border-accent-200 bg-cream-50">
      {/* Banner header */}
      <div className="px-4 pt-3 pb-2 border-b border-accent-200">
        <p className="text-[10px] uppercase tracking-[0.22em] text-accent-500 font-semibold">
          ✦ Pour vous —{" "}
          {labels.map((l, i) => (
            <span key={l}>
              {i > 0 && " · "}
              {l}
            </span>
          ))}
        </p>
      </div>

      {/* Horizontally scrollable mini-cards */}
      <div className="flex gap-3 overflow-x-auto px-4 py-3 scrollbar-hide">
        {sessions.map((s) => (
          <MiniCard key={s.id} session={s} userCredits={userCredits} />
        ))}
      </div>
    </div>
  );
}

function MiniCard({
  session,
  userCredits,
}: {
  session: PourVousSession;
  userCredits: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const start = new Date(session.startTime);
  const timeLabel = start.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateLabel = start.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const already = !!session.myBooking && session.myBooking.status !== "CANCELLED";

  const doBook = () => {
    startTransition(async () => {
      await bookAction(session.id);
      router.refresh();
    });
  };

  return (
    <div className="shrink-0 w-44 bg-white border border-stone2-200 flex flex-col p-3 gap-2">
      {/* Color dot + class type */}
      <div className="flex items-center gap-1.5">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: session.classTypeColor }}
        />
        <span className="text-[11px] font-semibold text-brand-600 truncate">
          {session.classTypeName}
        </span>
      </div>

      {/* Time */}
      <div>
        <p className="text-xs text-stone2-600 leading-tight">{timeLabel}</p>
        <p className="text-[10px] text-stone2-400 capitalize">{dateLabel}</p>
      </div>

      {/* Instructor */}
      <p className="text-[10px] text-stone2-500">{session.instructorFirstName}</p>

      {/* CTA */}
      {already ? (
        <span className="text-[10px] uppercase tracking-widest text-green-700 font-medium">
          ✓ Réservé
        </span>
      ) : (
        <button
          onClick={doBook}
          disabled={pending || userCredits <= 0}
          className="mt-auto text-[10px] uppercase tracking-[0.15em] bg-brand-600 text-cream-50 px-3 py-1.5 hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {pending ? "…" : "Réserver"}
        </button>
      )}
    </div>
  );
}
