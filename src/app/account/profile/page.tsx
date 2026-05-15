import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { updateProfileAction, changePasswordAction } from "./actions";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Mon profil</h1>

      {searchParams.success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
          {searchParams.success}
        </p>
      )}
      {searchParams.error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {searchParams.error}
        </p>
      )}

      <form action={updateProfileAction} className="card space-y-4">
        <h2 className="font-semibold text-lg">Informations personnelles</h2>
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
          <input name="phone" type="tel" defaultValue={user.phone ?? ""} className="input" placeholder="+33 6 00 00 00 00" />
        </div>
        <button className="btn-primary">Enregistrer</button>
      </form>

      <form action={changePasswordAction} className="card space-y-4">
        <h2 className="font-semibold text-lg">Changer le mot de passe</h2>
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
        <button className="btn-primary">Changer le mot de passe</button>
      </form>
    </div>
  );
}
