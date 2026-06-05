"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="max-w-xl mx-auto py-16 text-center space-y-4 px-4">
      <div className="w-14 h-14 mx-auto border border-stone2-200 flex items-center justify-center">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone2-500">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <h1 className="font-serif text-3xl font-medium text-brand-600">Une erreur est survenue</h1>
      <p className="text-stone2-600 text-sm">
        Désolé, quelque chose n&apos;a pas fonctionné. Si le problème persiste,
        contactez le studio.
      </p>
      {error.digest && (
        <p className="text-xs text-stone2-400 font-mono">ref: {error.digest}</p>
      )}
      <div className="flex justify-center gap-3 pt-4 flex-wrap">
        <button onClick={reset} className="btn-primary">
          Réessayer
        </button>
        <Link href="/" className="btn-secondary">
          Accueil
        </Link>
      </div>
    </div>
  );
}
