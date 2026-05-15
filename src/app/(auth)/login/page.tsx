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
    <div className="max-w-md mx-auto py-10">
      <div className="card">
        <h1 className="text-2xl font-bold mb-1">Connexion</h1>
        <p className="text-sm text-gray-500 mb-6">Heureux de vous revoir</p>
        {searchParams?.reset && (
          <p className="text-sm text-green-600 bg-green-50 rounded p-2 mb-4">
            Mot de passe mis à jour. Connectez-vous.
          </p>
        )}
        <form action={action} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input type="email" name="email" required className="input" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="label">Mot de passe</label>
              <Link href="/forgot-password" className="text-xs text-brand-600">
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
        <p className="text-sm text-gray-500 mt-4 text-center">
          Pas encore de compte ?{" "}
          <Link href="/register" className="text-brand-600 font-medium">
            Inscrivez-vous
          </Link>
        </p>
      </div>
    </div>
  );
}
