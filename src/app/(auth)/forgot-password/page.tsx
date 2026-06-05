import { forgotPasswordAction } from "./actions";

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { sent?: string };
}) {
  if (searchParams.sent) {
    return (
      <div className="max-w-sm mx-auto mt-24 card text-center space-y-3">
        <div className="w-12 h-12 mx-auto border border-stone2-200 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-600">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <h1 className="font-serif text-2xl font-medium text-brand-600">Email envoyé</h1>
        <p className="text-sm text-stone2-600">
          Si un compte existe avec cette adresse, vous recevrez un lien de
          réinitialisation dans les prochaines minutes.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto mt-24 space-y-6 px-4">
      <div className="text-center">
        <p className="section-title text-center">Studio Boutique</p>
        <h1 className="font-serif text-3xl font-medium text-brand-600 mt-1">Mot de passe oublié</h1>
        <p className="text-sm text-stone2-500 mt-2">
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
