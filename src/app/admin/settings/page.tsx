import { getSettings } from "@/lib/settings";
import { updateSettingsAction } from "./actions";
import { AdminToast } from "@/components/AdminToast";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string };
}) {
  const s = await getSettings();
  return (
    <div className="space-y-6">
      <AdminToast message={searchParams.success ?? searchParams.error ?? null} />
      <h1 className="text-2xl font-bold">Paramètres du studio</h1>
      <form action={updateSettingsAction} className="card space-y-4 max-w-2xl">
        <div>
          <label className="label">Nom du studio</label>
          <input name="studioName" defaultValue={s.studioName} required className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Délai d&apos;annulation gratuite (min)</label>
            <input
              type="number"
              name="cancellationCutoffMin"
              defaultValue={s.cancellationCutoffMin}
              min={0}
              required
              className="input"
            />
            <p className="text-xs text-gray-500 mt-1">
              Au-delà de ce délai, frais d&apos;annulation tardive appliqué.
            </p>
          </div>
          <div>
            <label className="label">Fenêtre de réservation (jours)</label>
            <input
              type="number"
              name="bookingWindowDays"
              defaultValue={s.bookingWindowDays}
              min={1}
              required
              className="input"
            />
          </div>
          <div>
            <label className="label">Frais d&apos;annulation tardive (crédits)</label>
            <input
              type="number"
              name="lateCancelFee"
              defaultValue={s.lateCancelFee}
              min={0}
              required
              className="input"
            />
          </div>
          <div>
            <label className="label">Frais d&apos;absence (crédits)</label>
            <input
              type="number"
              name="noShowFee"
              defaultValue={s.noShowFee}
              min={0}
              required
              className="input"
            />
          </div>
          <div>
            <label className="label">Crédits de bienvenue</label>
            <input
              type="number"
              name="welcomeCredits"
              defaultValue={s.welcomeCredits}
              min={0}
              required
              className="input"
            />
          </div>
          <div>
            <label className="label">Email expéditeur</label>
            <input
              type="email"
              name="emailFrom"
              defaultValue={s.emailFrom}
              required
              className="input"
            />
          </div>
        </div>
        <div>
          <label className="label">Clé publique Stripe (optionnel)</label>
          <input
            name="stripePublishableKey"
            defaultValue={s.stripePublishableKey ?? ""}
            placeholder="pk_test_..."
            className="input"
          />
        </div>
        <button className="btn-primary w-full">Enregistrer</button>
      </form>
    </div>
  );
}
