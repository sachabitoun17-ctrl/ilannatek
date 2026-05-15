import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { selfCheckInAction } from "./actions";

export default async function SelfCheckInPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const user = await getCurrentUser();
  const session = await db.session.findUnique({
    where: { id: params.sessionId },
    include: { classType: true, location: true },
  });
  if (!session) notFound();

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4 px-4">
        <p className="section-title text-center">Check-in</p>
        <h1 className="font-serif text-3xl font-medium text-brand-600">Connexion requise</h1>
        <p className="text-stone2-600 text-sm">
          Connectez-vous pour pointer votre arrivée à{" "}
          <strong>{session.classType.name}</strong>.
        </p>
        <Link
          href={`/login?next=/check-in/${params.sessionId}`}
          className="btn-primary inline-block"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  const booking = await db.booking.findUnique({
    where: { sessionId_userId: { sessionId: params.sessionId, userId: user.id } },
  });

  const alreadyCheckedIn = booking?.status === "ATTENDED";

  return (
    <div className="max-w-md mx-auto py-10 space-y-6 px-4">
      <div className="card text-center space-y-2">
        <p className="section-title text-center">Check-in</p>
        <h1 className="font-serif text-3xl font-medium text-brand-600">
          {session.classType.name}
        </h1>
        <p className="text-sm text-stone2-600">{formatDateTime(session.startTime)}</p>
        <p className="text-xs text-stone2-500">{session.location.name}</p>
      </div>

      {!booking || booking.status !== "CONFIRMED" ? (
        <div className="space-y-4">
          <div className="card border-l-4 border-accent-500 text-sm text-stone2-700">
            {!booking
              ? "Vous n'avez pas réservé ce cours."
              : booking.status === "ATTENDED"
              ? "✓ Vous êtes déjà pointé(e) pour ce cours."
              : booking.status === "WAITLIST"
              ? `Vous êtes sur liste d'attente (#${booking.waitlistPos}).`
              : `Réservation au statut ${booking.status}.`}
          </div>
          <Link
            href="/account"
            className="text-sm text-stone2-500 hover:text-brand-600 flex items-center gap-1"
          >
            ← Mon compte
          </Link>
        </div>
      ) : (
        <form action={selfCheckInAction} className="card space-y-2">
          <input type="hidden" name="sessionId" value={params.sessionId} />
          <button className="btn-primary w-full" disabled={alreadyCheckedIn}>
            {alreadyCheckedIn ? "✓ Déjà pointé(e)" : "Je suis là 👋"}
          </button>
        </form>
      )}
    </div>
  );
}
