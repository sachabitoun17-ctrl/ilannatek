"use client";

import { useState, useTransition } from "react";
import { sendTestEmailAction } from "./actions";

type Template = {
  key: string;
  label: string;
  description: string;
  trigger: string;
  subject: string;
  html: string;
};

export default function EmailsClient({
  templates,
  adminEmail,
}: {
  templates: Template[];
  adminEmail: string;
}) {
  const [selected, setSelected] = useState(templates[0]?.key ?? "");
  const [testTo, setTestTo] = useState(adminEmail);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    text: string;
    kind: "ok" | "err";
  } | null>(null);

  const tpl = templates.find((t) => t.key === selected) ?? templates[0];

  const handleSend = () => {
    if (!tpl) return;
    const fd = new FormData();
    fd.set("key", tpl.key);
    fd.set("to", testTo);
    startTransition(async () => {
      const result = await sendTestEmailAction(fd);
      setFeedback(
        result.ok
          ? { text: result.message ?? "Envoyé", kind: "ok" }
          : { text: result.error ?? "Erreur", kind: "err" }
      );
      setTimeout(() => setFeedback(null), 4000);
    });
  };

  return (
    <div className="grid md:grid-cols-[280px_1fr] gap-4">
      {/* Template list */}
      <aside className="bg-white border border-stone2-200">
        {templates.map((t) => (
          <button
            key={t.key}
            onClick={() => setSelected(t.key)}
            className={`w-full text-left px-4 py-3 border-b border-stone2-100 transition-colors ${
              selected === t.key
                ? "bg-brand-600 text-cream-50"
                : "hover:bg-cream-100 text-brand-600"
            }`}
          >
            <p className="font-medium text-sm">{t.label}</p>
            <p
              className={`text-[11px] mt-0.5 ${
                selected === t.key ? "text-stone2-300" : "text-stone2-500"
              }`}
            >
              {t.trigger}
            </p>
          </button>
        ))}
      </aside>

      {/* Preview + actions */}
      {tpl && (
        <div className="space-y-4 min-w-0">
          <div className="card">
            <p className="section-title">Template</p>
            <h2 className="font-serif text-2xl text-brand-600">{tpl.label}</h2>
            <p className="text-sm text-stone2-500 mt-1">{tpl.description}</p>
            <div className="grid sm:grid-cols-2 gap-4 mt-4 text-sm">
              <div>
                <p className="label">Sujet</p>
                <p className="text-brand-600">{tpl.subject}</p>
              </div>
              <div>
                <p className="label">Déclencheur</p>
                <p className="text-brand-600">{tpl.trigger}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-end justify-between gap-3 mb-3 flex-wrap">
              <div>
                <p className="label">Test d'envoi</p>
                <p className="text-xs text-stone2-500">
                  Envoie cet email avec des données d'exemple.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  type="email"
                  placeholder="votre@email.com"
                  className="input max-w-xs"
                />
                <button
                  onClick={handleSend}
                  disabled={pending || !testTo}
                  className="btn-primary"
                >
                  {pending ? "Envoi…" : "Envoyer"}
                </button>
              </div>
            </div>
            {feedback && (
              <p
                className={`text-sm border px-3 py-2 ${
                  feedback.kind === "ok"
                    ? "bg-cream-100 border-brand-600 text-brand-600"
                    : "bg-red-50 border-red-700 text-red-900"
                }`}
              >
                {feedback.text}
              </p>
            )}
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="bg-cream-100 border-b border-stone2-200 px-4 py-2 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-stone2-500">
                Aperçu
              </span>
              <span className="text-[10px] text-stone2-400">
                Données d'exemple
              </span>
            </div>
            <iframe
              srcDoc={tpl.html}
              title={`Aperçu ${tpl.label}`}
              className="w-full bg-white"
              style={{ height: 560, border: 0 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
