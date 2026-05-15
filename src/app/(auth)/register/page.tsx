"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
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
  return (
    <div className="max-w-md mx-auto py-10">
      <div className="card">
        <h1 className="text-2xl font-bold mb-1">Créer un compte</h1>
        <p className="text-sm text-gray-500 mb-6">
          Rejoignez la communauté en 30 secondes
        </p>
        <form action={action} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Prénom</label>
              <input name="firstName" required className="input" />
            </div>
            <div>
              <label className="label">Nom</label>
              <input name="lastName" required className="input" />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" name="email" required className="input" />
          </div>
          <div>
            <label className="label">Téléphone (optionnel)</label>
            <input type="tel" name="phone" className="input" />
          </div>
          <div>
            <label className="label">Mot de passe</label>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              className="input"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 8 caractères</p>
          </div>
          {state?.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}
          <SubmitButton />
        </form>
        <p className="text-sm text-gray-500 mt-4 text-center">
          Déjà inscrit ?{" "}
          <Link href="/login" className="text-brand-600 font-medium">
            Connectez-vous
          </Link>
        </p>
      </div>
    </div>
  );
}
