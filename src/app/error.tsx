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
      <p className="text-4xl">⚠</p>
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
