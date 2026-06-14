"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { createStudioClient, type CreateClientState } from "../actions";

const initial: CreateClientState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center px-8 py-3.5 bg-accent-500 text-white text-[11px] uppercase tracking-[0.22em] font-semibold hover:bg-accent-400 active:scale-[0.98] transition-all disabled:opacity-50 min-h-[48px]"
    >
      {pending ? "Création…" : "Créer le client"}
    </button>
  );
}

function Field({
  label,
  name,
  error,
  ...props
}: {
  label: string;
  name: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider text-stone2-400 mb-1.5">{label}</span>
      <input
        name={name}
        className="block w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-cream-50 placeholder:text-stone2-600 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 transition-colors"
        {...props}
      />
      {error && <span className="block text-[11px] text-red-400 mt-1">{error}</span>}
    </label>
  );
}

export default function CreateClientForm() {
  const [state, formAction] = useFormState(createStudioClient, initial);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-10 max-w-2xl">
      {state.error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      )}

      {/* Compte client */}
      <fieldset className="space-y-4">
        <legend className="text-cream-50 font-medium mb-3">Compte client</legend>
        <Field label="Nom du client" name="accountName" placeholder="Ex. Studio Lumen" error={fe.accountName} required />
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-[11px] uppercase tracking-wider text-stone2-400 mb-1.5">Plan</span>
            <select
              name="plan"
              defaultValue="STARTER"
              className="block w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-cream-50 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
            >
              <option value="STARTER">Starter</option>
              <option value="PRO">Pro</option>
              <option value="SCALE">Scale</option>
            </select>
          </label>
          <Field label="Email de contact" name="contactEmail" type="email" placeholder="contact@studio.fr" error={fe.contactEmail} />
        </div>
      </fieldset>

      {/* Studio */}
      <fieldset className="space-y-4">
        <legend className="text-cream-50 font-medium mb-3">Premier studio</legend>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nom du studio" name="studioName" placeholder="Ex. Lumen · Bastille" error={fe.studioName} required />
          <Field label="Slug (URL)" name="studioSlug" placeholder="lumen-bastille" error={fe.studioSlug} />
        </div>
        <Field label="Ville" name="city" placeholder="Paris" error={fe.city} />
        <p className="text-[11px] text-stone2-500">
          L&apos;espace sera accessible sur <span className="text-stone2-300">/studio/&lt;slug&gt;</span>. Laissez le slug
          vide pour le générer depuis le nom.
        </p>
      </fieldset>

      {/* Admin du studio */}
      <fieldset className="space-y-4">
        <legend className="text-cream-50 font-medium mb-3">Administrateur du studio</legend>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Prénom" name="adminFirstName" placeholder="Camille" error={fe.adminFirstName} required />
          <Field label="Nom" name="adminLastName" placeholder="Durand" error={fe.adminLastName} required />
        </div>
        <Field label="Email de connexion" name="adminEmail" type="email" placeholder="admin@studio.fr" error={fe.adminEmail} required />
        <Field label="Mot de passe provisoire" name="adminPassword" type="text" placeholder="8 caractères minimum" error={fe.adminPassword} required />
        <p className="text-[11px] text-stone2-500">
          Ce compte aura le rôle ADMIN, rattaché au nouveau studio. Communiquez-lui ces identifiants.
        </p>
      </fieldset>

      <div className="flex items-center gap-4 pt-2">
        <SubmitButton />
        <Link href="/superadmin" className="text-xs text-stone2-400 hover:text-cream-50 transition-colors">
          Annuler
        </Link>
      </div>
    </form>
  );
}
