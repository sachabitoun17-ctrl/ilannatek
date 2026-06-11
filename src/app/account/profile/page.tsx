export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { updateProfileAction, changePasswordAction } from "./actions";
import { SubmitButton } from "./SubmitButton";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-lg mx-auto space-y-8 px-4">
      <Link
        href="/account"
        className="text-sm text-stone2-500 hover:text-brand-600 flex items-center gap-1"
      >
        ← Mon compte
      </Link>
      <div>
        <p className="section-title">Mon espace</p>
        <h1 className="font-serif text-4xl font-medium text-brand-600 mt-1">Mon profil</h1>
      </div>

      {searchParams.success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 p-3">
          {searchParams.success}
        </p>
      )}
      {searchParams.error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 p-3">
          {searchParams.error}
        </p>
      )}

      <form action={updateProfileAction} className="card space-y-4">
        <h2 className="font-semibold text-brand-600">Informations personnelles</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Prénom</label>
            <input name="firstName" defaultValue={user.firstName} required className="input" />
          </div>
          <div>
            <label className="label">Nom</label>
            <input name="lastName" defaultValue={user.lastName} required className="input" />
          </div>
        </div>
        <div>
          <label className="label">Email</label>
          <input name="email" type="email" defaultValue={user.email} required className="input" />
        </div>
        <div>
          <label className="label">Téléphone</label>
          <input
            name="phone"
            type="tel"
            defaultValue={user.phone ?? ""}
            className="input"
            placeholder="+33 6 00 00 00 00"
          />
        </div>
        <div className="flex items-start gap-3 pt-1">
          <input
            type="checkbox"
            name="attendeeVisible"
            id="attendeeVisible"
            value="1"
            defaultChecked={(user as { attendeeVisible?: boolean }).attendeeVisible ?? false}
            className="mt-0.5 h-4 w-4 rounded border-stone2-300 accent-brand-600"
          />
          <label htmlFor="attendeeVisible" className="text-sm text-stone2-700 cursor-pointer">
            Afficher mon prénom dans la liste des participants<br />
            <span className="text-xs text-stone2-400">Les autres membres verront votre prénom sur les cours en commun.</span>
          </label>
        </div>
        <div className="flex items-start gap-3 pt-1">
          <input
            type="checkbox"
            name="emailOptIn"
            id="emailOptIn"
            value="1"
            defaultChecked={(user as { emailOptIn?: boolean }).emailOptIn ?? true}
            className="mt-0.5 h-4 w-4 rounded border-stone2-300 accent-brand-600"
          />
          <label htmlFor="emailOptIn" className="text-sm text-stone2-700 cursor-pointer">
            Recevoir les emails du studio (newsletters, récaps, offres)<br />
            <span className="text-xs text-stone2-400">Vous recevrez toujours les emails transactionnels (confirmations, annulations).</span>
          </label>
        </div>
        <SubmitButton label="Enregistrer" pendingLabel="Enregistrement..." />
      </form>

      <form action={changePasswordAction} className="card space-y-4">
        <h2 className="font-semibold text-brand-600">Changer le mot de passe</h2>
        <div>
          <label className="label">Mot de passe actuel</label>
          <input name="current" type="password" required className="input" />
        </div>
        <div>
          <label className="label">Nouveau mot de passe</label>
          <input name="password" type="password" required minLength={8} className="input" />
        </div>
        <div>
          <label className="label">Confirmer</label>
          <input name="passwordConfirm" type="password" required minLength={8} className="input" />
        </div>
        <SubmitButton label="Changer le mot de passe" pendingLabel="Changement..." />
      </form>
    </div>
  );
}
