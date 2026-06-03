import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

interface Props {
  params: { token: string };
}

export default async function InviteAcceptPage({ params }: Props) {
  const now = new Date();

  const invite = await db.friendInvite.findUnique({
    where: { token: params.token },
    include: {
      from: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  if (!invite) notFound();

  const isExpired = invite.expiresAt < now;
  const isUsed = !!invite.usedAt;

  const fromName = `${invite.from.firstName} ${invite.from.lastName}`;

  if (isUsed) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="max-w-sm">
          <p className="section-title text-center mb-4">Invitation</p>
          <h1 className="font-serif text-3xl text-brand-600 mb-4">
            Invitation déjà utilisée
          </h1>
          <p className="text-sm text-stone2-500 mb-8">
            Cette invitation a déjà été acceptée. Créez votre compte librement !
          </p>
          <Link href="/register" className="btn-primary">
            Créer mon compte
          </Link>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="max-w-sm">
          <p className="section-title text-center mb-4">Invitation</p>
          <h1 className="font-serif text-3xl text-brand-600 mb-4">
            Invitation expirée
          </h1>
          <p className="text-sm text-stone2-500 mb-8">
            Cette invitation de <strong>{fromName}</strong> a expiré.
            Vous pouvez tout de même créer un compte !
          </p>
          <Link href="/register" className="btn-primary">
            Créer mon compte
          </Link>
        </div>
      </div>
    );
  }

  const registerUrl = `/register?invite=${params.token}`;

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <p className="section-title text-center mb-2">Invitation personnelle</p>
          <h1 className="font-serif text-4xl md:text-5xl font-medium text-brand-600 mt-1 leading-none">
            Bienvenue !
          </h1>
        </div>

        {/* Invite card */}
        <div className="bg-white border border-stone2-200 p-8 space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-brand-600 flex items-center justify-center mx-auto mb-4">
              <span className="font-serif text-2xl text-cream-50">
                {invite.from.firstName[0]}{invite.from.lastName[0]}
              </span>
            </div>
            <p className="text-stone2-600 text-sm leading-relaxed">
              <strong className="text-brand-600">{fromName}</strong> vous invite à rejoindre{" "}
              <strong>Ilannatek Studio Boutique</strong>.
            </p>
          </div>

          <div className="bg-cream-50 border border-stone2-200 p-5 text-center space-y-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone2-400">Offre spéciale</p>
            <p className="font-serif text-3xl text-accent-500">1 crédit offert</p>
            <p className="text-xs text-stone2-500">
              À l'inscription via ce lien — et {invite.from.firstName} en reçoit un aussi !
            </p>
          </div>

          <div className="text-center text-xs text-stone2-400">
            Invitation valable jusqu'au{" "}
            {invite.expiresAt.toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>

          <Link
            href={registerUrl}
            className="btn-primary w-full text-center block"
          >
            Créer mon compte →
          </Link>
        </div>

        <p className="text-xs text-stone2-400 text-center">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-brand-600 hover:text-accent-600">
            Connectez-vous
          </Link>
        </p>
      </div>
    </div>
  );
}
