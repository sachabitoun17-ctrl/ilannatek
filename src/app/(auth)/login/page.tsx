"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { loginAction } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Connexion..." : "Se connecter"}
    </button>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { reset?: string };
}) {
  const [state, action] = useFormState(loginAction, null);
  return (
    <div className="min-h-[70vh] flex items-center justify-center -mx-4 md:-mx-8 -my-10 md:my-0">
      <div className="w-full flex flex-col md:flex-row min-h-[70vh]">

        {/* Brand panel — desktop left */}
        <div className="hidden md:flex flex-col justify-between bg-brand-600 p-16 md:w-[45%] lg:w-[40%] shrink-0">
          <div>
            <p className="font-serif text-3xl text-cream-50 tracking-[0.15em] uppercase mb-12">
              Ilannatek
            </p>
            <h2 className="font-serif text-5xl font-medium text-cream-50 leading-[0.9] mb-6">
              Le studio
              <br />
              <span className="italic font-normal text-accent-300">qui vous attend.</span>
            </h2>
            <p className="text-stone2-300 text-sm leading-relaxed max-w-xs">
              Planning, réservations, suivi de crédits — tout au même endroit.
            </p>
          </div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-stone2-500">
            Studio Boutique · Paris
          </p>
        </div>

        {/* Form panel */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 bg-cream-50">
          <div className="w-full max-w-sm">

            <div className="mb-10">
              <p className="section-title mb-3">Bienvenue</p>
              <h1 className="font-serif text-4xl md:text-5xl font-medium text-brand-600 leading-tight">
                Connexion
              </h1>
              <p className="text-sm text-stone2-500 mt-2">
                Heureux·se de vous revoir.
              </p>
            </div>

            {searchParams?.reset && (
              <div className="bg-emerald-50 border border-emerald-200 px-4 py-3 mb-6">
                <p className="text-sm text-emerald-800">Mot de passe mis à jour. Connectez-vous.</p>
              </div>
            )}

            <form action={action} className="space-y-5">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  className="input text-base"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label mb-0">Mot de passe</label>
                  <Link
                    href="/forgot-password"
                    className="text-[10px] uppercase tracking-widest text-stone2-400 hover:text-brand-600 transition-colors"
                  >
                    Oublié ?
                  </Link>
                </div>
                <input
                  type="password"
                  name="password"
                  required
                  autoComplete="current-password"
                  className="input text-base"
                />
              </div>
              {state?.error && (
                <div className="bg-red-50 border border-red-200 px-4 py-3">
                  <p className="text-sm text-red-800">{state.error}</p>
                </div>
              )}
              <div className="pt-1">
                <SubmitButton />
              </div>
            </form>

            <p className="text-sm text-stone2-400 mt-8 text-center">
              Pas encore de compte ?{" "}
              <Link href="/register" className="text-brand-600 font-medium hover:text-accent-600 transition-colors">
                Inscrivez-vous
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
