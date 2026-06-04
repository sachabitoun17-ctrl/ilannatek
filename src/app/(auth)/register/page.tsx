"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import { registerAction } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Création..." : "Créer mon compte"}
    </button>
  );
}

export default function RegisterPage() {
  const [state, action] = useFormState(registerAction, null);
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  return (
    <div className="min-h-[80vh] flex items-center justify-center -mx-4 md:-mx-8 -my-10 md:my-0">
      <div className="w-full flex flex-col md:flex-row min-h-[80vh]">

        {/* Brand panel — desktop left */}
        <div className="hidden md:flex flex-col justify-between bg-brand-600 p-16 md:w-[45%] lg:w-[40%] shrink-0">
          <div>
            <p className="font-serif text-3xl text-cream-50 tracking-[0.15em] uppercase mb-12">
              Ilannatek
            </p>
            <h2 className="font-serif text-5xl font-medium text-cream-50 leading-[0.9] mb-6">
              Commencez
              <br />
              <span className="italic font-normal text-accent-300">dès aujourd&apos;hui.</span>
            </h2>
            <p className="text-stone2-300 text-sm leading-relaxed max-w-xs">
              Créez votre compte en 30 secondes et réservez votre premier cours dans la foulée.
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
              <p className="section-title mb-3">Nouveau membre</p>
              <h1 className="font-serif text-4xl md:text-5xl font-medium text-brand-600 leading-tight">
                Créer un compte
              </h1>
              <p className="text-sm text-stone2-500 mt-2">
                Rejoignez la communauté en 30 secondes.
              </p>
            </div>

            {inviteToken && (
              <div className="mb-6 bg-accent-50 border border-accent-200 px-4 py-3">
                <p className="text-sm text-accent-700">
                  Invitation détectée — vous recevrez{" "}
                  <strong>1 crédit offert</strong> à l&apos;inscription.
                </p>
              </div>
            )}

            <form action={action} className="space-y-5">
              {inviteToken && (
                <input type="hidden" name="inviteToken" value={inviteToken} />
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Prénom</label>
                  <input
                    name="firstName"
                    required
                    autoFocus
                    autoComplete="given-name"
                    className="input text-base"
                  />
                </div>
                <div>
                  <label className="label">Nom</label>
                  <input
                    name="lastName"
                    required
                    autoComplete="family-name"
                    className="input text-base"
                  />
                </div>
              </div>
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
                <label className="label">
                  Téléphone
                  <span className="ml-1 normal-case font-normal text-stone2-400">(optionnel)</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  className="input text-base"
                  placeholder="+33 6 00 00 00 00"
                />
              </div>
              <div>
                <label className="label">Mot de passe</label>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="input text-base"
                />
                <p className="text-xs text-stone2-400 mt-1.5">Minimum 8 caractères</p>
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
              Déjà membre ?{" "}
              <Link href="/login" className="text-brand-600 font-medium hover:text-accent-600 transition-colors">
                Connectez-vous
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
