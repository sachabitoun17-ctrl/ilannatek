"use client";

import { useState, useTransition } from "react";
import { broadcastEmailAction, generateEmailBodyAction } from "./actions";

const AUDIENCES = [
  { value: "all", label: "Tous les membres actifs", desc: "Tous les comptes actifs (membres + instructeurs)" },
  { value: "active_sub", label: "Abonnés actifs", desc: "Membres avec un abonnement en cours" },
  { value: "no_sub", label: "Sans abonnement", desc: "Membres sans abonnement actif — propice pour une offre" },
  { value: "zero_credits", label: "Solde zéro", desc: "Membres avec 0 crédit — à relancer" },
];

export default function BroadcastPage() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message?: string; error?: string } | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [confirmed, setConfirmed] = useState(false);
  const [generating, startGenerating] = useTransition();
  const [aiError, setAiError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!confirmed) { setConfirmed(true); return; }
    const fd = new FormData(e.currentTarget);
    setResult(null);
    startTransition(async () => {
      const r = await broadcastEmailAction(fd);
      setResult(r);
      setConfirmed(false);
      if (r.ok) { setSubject(""); setBody(""); }
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="section-title">Communication</p>
        <h1 className="font-serif text-4xl font-medium text-brand-600 mt-0.5">
          Email broadcast
        </h1>
        <p className="text-sm text-stone2-500 mt-1">
          Envoyez un email à un segment de vos membres. Chaque email est envoyé individuellement.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Audience */}
        <div className="card space-y-3">
          <p className="section-title">Destinataires</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {AUDIENCES.map((a) => (
              <label
                key={a.value}
                className={`flex items-start gap-3 border p-4 cursor-pointer transition-colors ${
                  audience === a.value
                    ? "border-brand-600 bg-cream-100"
                    : "border-stone2-200 bg-white hover:border-brand-400"
                }`}
              >
                <input
                  type="radio"
                  name="audience"
                  value={a.value}
                  checked={audience === a.value}
                  onChange={() => { setAudience(a.value); setConfirmed(false); }}
                  className="mt-0.5 accent-brand-600"
                />
                <div>
                  <p className="text-sm font-medium text-brand-600">{a.label}</p>
                  <p className="text-xs text-stone2-500 mt-0.5">{a.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Contenu */}
        <div className="card space-y-4">
          <p className="section-title">Contenu</p>
          <div>
            <label className="label" htmlFor="subject">Sujet</label>
            <input
              id="subject"
              name="subject"
              type="text"
              required
              maxLength={200}
              value={subject}
              onChange={(e) => { setSubject(e.target.value); setConfirmed(false); }}
              className="input"
              placeholder="Nouveautés du studio — Mai 2025"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0" htmlFor="body">Message</label>
              <button
                type="button"
                disabled={generating || !subject.trim()}
                onClick={() => {
                  setAiError(null);
                  startGenerating(async () => {
                    const r = await generateEmailBodyAction(audience, subject);
                    if (r.ok) {
                      setBody(r.body);
                      setConfirmed(false);
                    } else {
                      setAiError(r.error);
                    }
                  });
                }}
                className="btn-secondary py-1 px-3 text-xs flex items-center gap-1.5 disabled:opacity-40"
                title={!subject.trim() ? "Saisissez un sujet d'abord" : ""}
              >
                {generating ? (
                  <>
                    <span className="inline-block w-3 h-3 border border-brand-400 border-t-transparent rounded-full animate-spin" />
                    Génération…
                  </>
                ) : (
                  <>✦ Générer avec l&apos;IA</>
                )}
              </button>
            </div>
            {aiError && (
              <p className="text-xs text-red-600 mb-1">{aiError}</p>
            )}
            <textarea
              id="body"
              name="body"
              required
              rows={10}
              value={body}
              onChange={(e) => { setBody(e.target.value); setConfirmed(false); }}
              className="input resize-y"
              placeholder={`Bonjour,\n\nNous avons le plaisir de vous annoncer...\n\nÀ très bientôt au studio,\nL'équipe Ilannatek`}
            />
            <p className="text-xs text-stone2-400 mt-1">
              Séparez vos paragraphes par une ligne vide. Le style de marque sera appliqué automatiquement.
            </p>
          </div>
        </div>

        {/* Résultat */}
        {result && (
          <div className={`px-4 py-3 border text-sm ${result.ok ? "border-green-400 bg-green-50 text-green-800" : "border-red-400 bg-red-50 text-red-800"}`}>
            {result.ok ? result.message : result.error}
          </div>
        )}

        {/* Confirmation + envoi */}
        {confirmed ? (
          <div className="card border-l-4 border-l-amber-500 space-y-3">
            <p className="text-sm font-medium text-brand-600">
              Confirmer l'envoi ?
            </p>
            <p className="text-xs text-stone2-500">
              Sujet : <strong>{subject}</strong><br />
              Audience : <strong>{AUDIENCES.find((a) => a.value === audience)?.label}</strong>
            </p>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={pending}
                className="btn-primary text-sm"
              >
                {pending ? "Envoi en cours…" : "Confirmer l'envoi →"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmed(false)}
                className="btn-secondary text-sm"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button
            type="submit"
            disabled={pending || !subject.trim() || !body.trim()}
            className="btn-primary disabled:opacity-40"
          >
            Préparer l'envoi →
          </button>
        )}
      </form>
    </div>
  );
}
