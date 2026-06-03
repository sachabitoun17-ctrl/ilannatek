"use client";

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
  pending: { label: "En attente", classes: "bg-accent-100 text-accent-600" },
  accepted: { label: "Acceptée", classes: "bg-green-100 text-green-800" },
  expired: { label: "Expirée", classes: "bg-stone2-100 text-stone2-500" },
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
}: {
  invites: Invite[];
  activeCount: number;
}) {
  const [state, action] = useFormState(sendInviteAction, null);

  return (
    <div className="space-y-8">
      {/* Send invite form */}
      <div className="bg-white border border-stone2-200 p-6 space-y-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone2-400 mb-1">
            Nouvelle invitation
          </p>
          <p className="font-serif text-2xl text-brand-600">Inviter un ami</p>
          {activeCount >= 3 ? (
            <p className="text-sm text-orange-700 mt-2">
              Vous avez atteint la limite de 3 invitations actives simultanées.
            </p>
          ) : (
            <p className="text-sm text-stone2-500 mt-1">
              {3 - activeCount} invitation{3 - activeCount > 1 ? "s" : ""} restante{3 - activeCount > 1 ? "s" : ""} disponible{3 - activeCount > 1 ? "s" : ""}
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
              disabled={activeCount >= 3}
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

        <div className="border-t border-stone2-100 pt-4">
          <p className="text-xs text-stone2-400 leading-relaxed">
            Votre ami recevra un email avec un lien pour créer son compte. À l'inscription, il obtiendra{" "}
            <strong>1 crédit offert</strong> — et vous aussi !
            L'invitation est valable <strong>30 jours</strong>. Maximum 3 invitations actives simultanément.
          </p>
        </div>
      </div>

      {/* Past invites */}
      {invites.length > 0 && (
        <div>
          <p className="section-title mb-3">Mes invitations</p>
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

      {invites.length === 0 && (
        <p className="text-sm text-stone2-400 text-center py-8">
          Vous n'avez encore envoyé aucune invitation.
        </p>
      )}
    </div>
  );
}
