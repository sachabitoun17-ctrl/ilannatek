import { forgotPasswordAction } from "./actions";

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { sent?: string };
}) {
  if (searchParams.sent) {
    return (
      <div className="max-w-sm mx-auto mt-24 card text-center space-y-3">
        <p className="text-4xl">📬</p>
        <h1 className="text-xl font-bold">Email envoyé</h1>
        <p className="text-sm text-gray-600">
          Si un compte existe avec cette adresse, vous recevrez un lien de
          réinitialisation dans les prochaines minutes.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto mt-24 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Mot de passe oublié</h1>
        <p className="text-sm text-gray-600 mt-1">
          Entrez votre email pour recevoir un lien de réinitialisation.
        </p>
      </div>
      <form action={forgotPasswordAction} className="card space-y-4">
        <div>
          <label className="label">Email</label>
          <input name="email" type="email" required className="input" autoFocus />
        </div>
        <button className="btn-primary w-full">Envoyer le lien</button>
      </form>
    </div>
  );
}
