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
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="section-title text-center">Studio Boutique</p>
          <h1 className="font-serif text-4xl font-medium text-brand-600 mt-1">Créer un compte</h1>
          <p className="text-sm text-stone2-500 mt-2">
            Rejoignez la communauté en 30 secondes
          </p>
        </div>

        {inviteToken && (
          <div className="mb-5 bg-cream-50 border border-accent-200 px-4 py-3 text-sm text-accent-600">
            Invitation détectée — vous recevrez <strong>1 crédit offert</strong> à l'inscription !
          </div>
        )}

        <form action={action} className="space-y-5">
          {inviteToken && (
            <input type="hidden" name="inviteToken" value={inviteToken} />
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Prénom</label>
              <input name="firstName" required className="input" autoFocus />
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
            <label className="label">
              Téléphone{" "}
              <span className="normal-case font-normal text-stone2-400">(optionnel)</span>
            </label>
            <input type="tel" name="phone" className="input" placeholder="+33 6 00 00 00 00" />
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
            <p className="text-xs text-stone2-400 mt-1.5">Minimum 8 caractères</p>
          </div>
          {state?.error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 p-3">
              {state.error}
            </p>
          )}
          <SubmitButton />
        </form>

        <p className="text-sm text-stone2-500 mt-6 text-center">
          Déjà inscrit ?{" "}
          <Link href="/login" className="text-brand-600 font-medium hover:text-accent-600">
            Connectez-vous
          </Link>
        </p>
      </div>
    </div>
  );
}
