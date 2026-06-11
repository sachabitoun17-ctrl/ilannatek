"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { verifyOtpAction, resendOtpAction } from "../../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Vérification..." : "Vérifier"}
    </button>
  );
}

export default function VerifyOtpPage() {
  const [state, action] = useFormState(verifyOtpAction, null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resending, startResend] = useTransition();

  const handleResend = () => {
    startResend(async () => {
      const res = await resendOtpAction();
      setResendMsg(res?.error ?? "Un nouveau code vient d'être envoyé.");
    });
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="section-title text-center">Vérification</p>
          <h1 className="font-serif text-4xl font-medium text-brand-600 mt-1">Code de connexion</h1>
          <p className="text-sm text-stone2-500 mt-2">
            Un code à 6 chiffres vous a été envoyé par email. Il expire dans 10 minutes.
          </p>
        </div>

        <form action={action} className="space-y-5">
          <div>
            <label className="label">Code</label>
            <input
              type="text"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
              autoFocus
              className="input text-center text-2xl tracking-[0.5em] font-medium"
              placeholder="······"
            />
          </div>
          {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
          {resendMsg && <p className="text-sm text-brand-600">{resendMsg}</p>}
          <SubmitButton />
        </form>

        <div className="flex items-center justify-between mt-6 text-sm">
          <button
            onClick={handleResend}
            disabled={resending}
            className="text-brand-600 hover:text-accent-600 disabled:opacity-40"
          >
            {resending ? "Envoi..." : "Renvoyer le code"}
          </button>
          <Link href="/login" className="text-stone2-500 hover:text-brand-600">
            ← Retour
          </Link>
        </div>
      </div>
    </div>
  );
}
