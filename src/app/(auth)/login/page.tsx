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
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="section-title text-center">Studio Boutique</p>
          <h1 className="text-3xl font-bold text-gray-900 mt-1">Connexion</h1>
          <p className="text-sm text-gray-500 mt-2">Heureux de vous revoir</p>
        </div>

        {searchParams?.reset && (
          <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md p-3 mb-6">
            Mot de passe mis à jour. Connectez-vous.
          </p>
        )}

        <form action={action} className="space-y-5">
          <div>
            <label className="label">Email</label>
            <input type="email" name="email" required className="input" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">Mot de passe</label>
              <Link href="/forgot-password" className="text-xs text-brand-600 hover:text-brand-700">
                Mot de passe oublié ?
              </Link>
            </div>
            <input type="password" name="password" required className="input" />
          </div>
          {state?.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}
          <SubmitButton />
        </form>

        <p className="text-sm text-gray-500 mt-6 text-center">
          Pas encore de compte ?{" "}
          <Link href="/register" className="text-brand-600 font-medium hover:text-brand-700">
            Inscrivez-vous
          </Link>
        </p>
      </div>
    </div>
  );
}
