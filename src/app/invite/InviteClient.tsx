"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { sendInviteAction } from "./actions";

type Invite = {
  id: string;
  toEmail: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  status: "pending" | "accepted" | "expired";
};

const STATUS_CONFIG = {
  pending: { label: "En attente", classes: "badge-amber" },
  accepted: { label: "Acceptée", classes: "badge-green" },
  expired: { label: "Expirée", classes: "badge-gray" },
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Envoi…" : "Envoyer l'invitation"}
    </button>
  );
}

export default function InviteClient({
  invites,
  activeCount,
  acceptedCount,
  referralUrl,
}: {
  invites: Invite[];
  activeCount: number;
  acceptedCount: number;
  referralUrl: string;
}) {
  const [state, action] = useFormState(sendInviteAction, null);
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(referralUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="space-y-8">

      {/* Stats banner */}
      {acceptedCount > 0 && (
        <div className="bg-brand-600 text-cream-50 px-6 py-4 flex items-center gap-4">
          <div className="w-1 self-stretch bg-accent-400 shrink-0" />
          <div>
            <p className="font-semibold text-sm">
              {acceptedCount} ami{acceptedCount > 1 ? "s" : ""} parrainé{acceptedCount > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-stone2-300 mt-0.5">
              {acceptedCount} crédit{acceptedCount > 1 ? "s" : ""} gagné{acceptedCount > 1 ? "s" : ""} grâce au parrainage
            </p>
          </div>
        </div>
      )}

      {/* Shareable link */}
      <div className="bg-white border border-stone2-200 p-6 space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone2-400 mb-1">Votre lien personnel</p>
          <p className="font-serif text-2xl text-brand-600">Partager mon lien</p>
          <p className="text-sm text-stone2-500 mt-1">
            Partagez ce lien sur WhatsApp, Instagram ou par SMS — valable à vie, utilisable à l&apos;infini.
          </p>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={referralUrl}
            className="input flex-1 text-xs text-stone2-500 bg-stone2-50 cursor-text select-all"
            onFocus={(e) => e.target.select()}
          />
          <button
            type="button"
            onClick={copyLink}
            className={`px-5 py-2.5 text-[10px] uppercase tracking-widest font-medium transition-colors shrink-0 ${
              copied
                ? "bg-green-100 text-green-800 border border-green-200"
                : "btn-primary"
            }`}
          >
            {copied ? "Copié !" : "Copier"}
          </button>
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Rejoins Ilannatek Studio, c'est trop bien ! 1 crédit offert à l'inscription via mon lien : ${referralUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 border border-stone2-200 text-xs text-stone2-600 hover:text-brand-600 hover:border-brand-600 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </a>
          <a
            href={`sms:?body=${encodeURIComponent(`Rejoins Ilannatek Studio ! 1 crédit offert via mon lien : ${referralUrl}`)}`}
            className="inline-flex items-center gap-2 px-4 py-2 border border-stone2-200 text-xs text-stone2-600 hover:text-brand-600 hover:border-brand-600 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            SMS
          </a>
        </div>
      </div>

      {/* Email invite form */}
      <div className="bg-white border border-stone2-200 p-6 space-y-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone2-400 mb-1">Par email</p>
          <p className="font-serif text-2xl text-brand-600">Invitation directe</p>
          {activeCount >= 10 ? (
            <p className="text-sm text-orange-700 mt-2">
              Vous avez atteint la limite de 10 invitations actives simultanées.
            </p>
          ) : (
            <p className="text-sm text-stone2-500 mt-1">
              {10 - activeCount} invitation{10 - activeCount > 1 ? "s" : ""} email restante{10 - activeCount > 1 ? "s" : ""}
            </p>
          )}
        </div>

        <form action={action} className="space-y-4">
          <div>
            <label className="label">Email de votre ami</label>
            <input
              type="email"
              name="toEmail"
              required
              placeholder="ami@exemple.fr"
              className="input"
              disabled={activeCount >= 10}
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 p-3">
              {state.error}
            </p>
          )}
          {state?.success && (
            <p className="text-sm text-green-800 bg-green-50 border border-green-200 p-3">
              {state.success}
            </p>
          )}

          <SubmitButton />
        </form>

        <p className="text-xs text-stone2-400 border-t border-stone2-100 pt-4 leading-relaxed">
          Votre ami recevra un email avec un lien pour créer son compte et récupérer son crédit.
          L&apos;invitation email est valable <strong>30 jours</strong>.
        </p>
      </div>

      {/* Past email invites */}
      {invites.length > 0 && (
        <div>
          <p className="section-title mb-3">Invitations email envoyées</p>
          <div className="bg-white border border-stone2-200 divide-y divide-stone2-100">
            {invites.map((inv) => {
              const cfg = STATUS_CONFIG[inv.status];
              return (
                <div
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div>
                    <p className="text-sm font-medium text-brand-600">{inv.toEmail}</p>
                    <p className="text-xs text-stone2-400 mt-0.5">
                      Envoyée le{" "}
                      {new Date(inv.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      {inv.status === "pending" && (
                        <>
                          {" · "}Expire le{" "}
                          {new Date(inv.expiresAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                          })}
                        </>
                      )}
                      {inv.usedAt && (
                        <>
                          {" · "}Acceptée le{" "}
                          {new Date(inv.usedAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                          })}
                        </>
                      )}
                    </p>
                  </div>
                  <span className={`badge ${cfg.classes}`}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
