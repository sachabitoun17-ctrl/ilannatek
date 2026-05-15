import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { resetPasswordAction } from "./actions";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string; error?: string };
}) {
  const token = searchParams.token;
  if (!token) notFound();

  const record = await db.passwordResetToken.findUnique({
    where: { token },
    include: { user: { select: { firstName: true } } },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return (
      <div className="max-w-sm mx-auto mt-24 card text-center space-y-3">
        <p className="text-4xl">⏰</p>
        <h1 className="text-xl font-bold">Lien expiré ou invalide</h1>
        <p className="text-sm text-gray-600">
          Ce lien n'est plus valide. Faites une nouvelle demande.
        </p>
        <a href="/forgot-password" className="btn-primary inline-block">
          Nouvelle demande
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto mt-24 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">
          Nouveau mot de passe
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Bonjour {record.user.firstName}, choisissez un nouveau mot de passe.
        </p>
      </div>
      <form action={resetPasswordAction} className="card space-y-4">
        <input type="hidden" name="token" value={token} />
        {searchParams.error && (
          <p className="text-sm text-red-600">{searchParams.error}</p>
        )}
        <div>
          <label className="label">Nouveau mot de passe</label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="input"
            autoFocus
          />
        </div>
        <div>
          <label className="label">Confirmer le mot de passe</label>
          <input
            name="passwordConfirm"
            type="password"
            required
            minLength={8}
            className="input"
          />
        </div>
        <button className="btn-primary w-full">Enregistrer</button>
      </form>
    </div>
  );
}
