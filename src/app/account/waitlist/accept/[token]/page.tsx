import { db } from "@/lib/db";
import { sendEmail, emailTemplates } from "@/lib/email";
import { audit } from "@/lib/audit";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

// ─── Server action: confirm the booking via token ─────────────────────────────

async function confirmWaitlistBooking(formData: FormData) {
  "use server";
  const token = formData.get("token") as string;
  if (!token) return;

  const waitlistToken = await db.waitlistToken.findUnique({
    where: { token },
    include: {
      booking: {
        include: {
          session: {
            include: { classType: true, location: true },
          },
          user: true,
        },
      },
    },
  });

  if (!waitlistToken) redirect(`/account/waitlist/accept/${token}?error=invalid`);
  if (waitlistToken.usedAt) redirect(`/account/waitlist/accept/${token}?error=already_used`);
  if (waitlistToken.expiresAt < new Date()) {
    redirect(`/account/waitlist/accept/${token}?error=expired`);
  }

  const booking = waitlistToken.booking;
  const user = booking.user;
  const session = booking.session;
  const cost = session.classType.creditCost;

  // Credit check is inside the transaction to prevent TOCTOU race (concurrent requests)
  let insufficientCredits = false;
  await db.$transaction(async (tx) => {
    const freshUser = await tx.user.findUnique({ where: { id: user.id }, select: { creditsBalance: true } });
    if (!freshUser || freshUser.creditsBalance < cost) {
      insufficientCredits = true;
      return;
    }

    // Mark token used
    await tx.waitlistToken.update({
      where: { id: waitlistToken.id },
      data: { usedAt: new Date() },
    });

    // Promote booking to CONFIRMED
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: "CONFIRMED",
        waitlistPos: null,
        creditsUsed: cost,
        promotedFromWaitlistAt: new Date(),
      },
    });

    // Deduct credits
    await tx.user.update({
      where: { id: user.id },
      data: { creditsBalance: { decrement: cost } },
    });

    // Transaction log
    await tx.transaction.create({
      data: {
        userId: user.id,
        type: "CREDIT_USE",
        creditsDelta: -cost,
        description: `Promotion liste d'attente — ${session.classType.name}`,
        paymentStatus: "FREE",
      },
    });

    // Reindex remaining waitlist
    const remaining = await tx.booking.findMany({
      where: { sessionId: session.id, status: "WAITLIST" },
      orderBy: { waitlistPos: "asc" },
    });
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].waitlistPos !== i + 1) {
        await tx.booking.update({
          where: { id: remaining[i].id },
          data: { waitlistPos: i + 1 },
        });
      }
    }
  });
  if (insufficientCredits) redirect(`/account/waitlist/accept/${token}?error=insufficient_credits`);

  // Audit
  void audit({
    actorId: user.id,
    action: "WAITLIST_ACCEPT",
    entity: "Booking",
    entityId: booking.id,
    metadata: { token },
  });

  // Send confirmation email
  void sendEmail({
    to: user.email,
    ...emailTemplates.bookingConfirmed({
      firstName: user.firstName,
      className: session.classType.name,
      startTime: session.startTime,
      location: session.location.name,
      instructor: "",
    }),
  });

  redirect(`/account/waitlist/accept/${token}?success=1`);
}

// ─── Page component ──────────────────────────────────────────────────────────

type PageProps = {
  params: { token: string };
  searchParams: { error?: string; success?: string };
};

export default async function WaitlistAcceptPage({ params, searchParams }: PageProps) {
  const { token } = params;

  // Handle post-action redirects
  if (searchParams.success === "1") {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-stone2-200 p-10 text-center">
          <div className="w-14 h-14 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-accent-600 text-2xl">✓</span>
          </div>
          <h1 className="font-serif text-3xl text-brand-600 mb-3">Réservation confirmée</h1>
          <p className="text-stone2-500 text-sm mb-8">
            Votre place est confirmée. Un email de confirmation vous a été envoyé.
          </p>
          <Link href="/account" className="btn-primary">
            Voir mes réservations
          </Link>
        </div>
      </div>
    );
  }

  if (searchParams.error === "already_used") {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-stone2-200 p-10 text-center">
          <h1 className="font-serif text-3xl text-brand-600 mb-3">Déjà confirmé</h1>
          <p className="text-stone2-500 text-sm mb-8">
            Cette réservation a déjà été confirmée.
          </p>
          <Link href="/account" className="btn-primary">Mon espace</Link>
        </div>
      </div>
    );
  }

  if (searchParams.error === "insufficient_credits") {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-stone2-200 p-10 text-center">
          <h1 className="font-serif text-3xl text-brand-600 mb-3">Crédits insuffisants</h1>
          <p className="text-stone2-500 text-sm mb-8">
            Vous ne disposez pas de crédits suffisants pour confirmer cette réservation.
          </p>
          <Link href="/packs" className="btn-primary">Recharger mes crédits</Link>
        </div>
      </div>
    );
  }

  if (searchParams.error === "expired" || searchParams.error === "invalid") {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-stone2-200 p-10 text-center">
          <h1 className="font-serif text-3xl text-brand-600 mb-3">Lien expiré</h1>
          <p className="text-stone2-500 text-sm mb-8">
            Ce lien a expiré. La place a été proposée à un autre membre.
          </p>
          <Link href="/schedule" className="btn-primary">Voir le planning</Link>
        </div>
      </div>
    );
  }

  // Load token data
  const waitlistToken = await db.waitlistToken.findUnique({
    where: { token },
    include: {
      booking: {
        include: {
          session: {
            include: {
              classType: true,
              location: true,
              instructor: { select: { firstName: true, lastName: true } },
            },
          },
          user: { select: { firstName: true } },
        },
      },
    },
  });

  if (!waitlistToken) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-stone2-200 p-10 text-center">
          <h1 className="font-serif text-3xl text-brand-600 mb-3">Lien invalide</h1>
          <p className="text-stone2-500 text-sm mb-8">
            Ce lien est invalide ou a déjà été utilisé.
          </p>
          <Link href="/" className="btn-primary">Accueil</Link>
        </div>
      </div>
    );
  }

  if (waitlistToken.usedAt) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-stone2-200 p-10 text-center">
          <h1 className="font-serif text-3xl text-brand-600 mb-3">Déjà confirmé</h1>
          <p className="text-stone2-500 text-sm mb-8">
            Cette réservation a déjà été confirmée.
          </p>
          <Link href="/account" className="btn-primary">Mon espace</Link>
        </div>
      </div>
    );
  }

  if (waitlistToken.expiresAt < new Date()) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-stone2-200 p-10 text-center">
          <h1 className="font-serif text-3xl text-brand-600 mb-3">Lien expiré</h1>
          <p className="text-stone2-500 text-sm mb-8">
            Ce lien a expiré. La place a été proposée à un autre membre.
          </p>
          <Link href="/schedule" className="btn-primary">Voir le planning</Link>
        </div>
      </div>
    );
  }

  const { booking } = waitlistToken;
  const session = booking.session;
  const minutesLeft = Math.max(
    0,
    Math.floor((waitlistToken.expiresAt.getTime() - Date.now()) / 60000)
  );

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white border border-stone2-200 p-8 md:p-10">
          {/* Urgency banner */}
          <div className="bg-accent-50 border border-accent-200 px-4 py-3 mb-8 text-center">
            <p className="text-accent-700 text-sm font-medium">
              Place disponible — {minutesLeft} min restante{minutesLeft > 1 ? "s" : ""}
            </p>
          </div>

          <p className="section-title mb-2">Bonjour {booking.user.firstName},</p>
          <h1 className="font-serif text-3xl md:text-4xl text-brand-600 mb-6">
            Une place s'est libérée
          </h1>

          {/* Session details */}
          <div className="border border-stone2-200 divide-y divide-stone2-100 mb-8">
            <div className="flex gap-3 px-4 py-3 text-sm">
              <span className="text-stone2-500 uppercase tracking-[0.1em] text-[11px] min-w-[80px] pt-0.5">Cours</span>
              <strong className="text-brand-600">{session.classType.name}</strong>
            </div>
            <div className="flex gap-3 px-4 py-3 text-sm">
              <span className="text-stone2-500 uppercase tracking-[0.1em] text-[11px] min-w-[80px] pt-0.5">Date</span>
              <strong>{session.startTime.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</strong>
            </div>
            <div className="flex gap-3 px-4 py-3 text-sm">
              <span className="text-stone2-500 uppercase tracking-[0.1em] text-[11px] min-w-[80px] pt-0.5">Heure</span>
              <strong>{session.startTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</strong>
            </div>
            <div className="flex gap-3 px-4 py-3 text-sm">
              <span className="text-stone2-500 uppercase tracking-[0.1em] text-[11px] min-w-[80px] pt-0.5">Studio</span>
              <strong>{session.location.name}</strong>
            </div>
            <div className="flex gap-3 px-4 py-3 text-sm">
              <span className="text-stone2-500 uppercase tracking-[0.1em] text-[11px] min-w-[80px] pt-0.5">Instructeur</span>
              <strong>{session.instructor.firstName} {session.instructor.lastName}</strong>
            </div>
            <div className="flex gap-3 px-4 py-3 text-sm">
              <span className="text-stone2-500 uppercase tracking-[0.1em] text-[11px] min-w-[80px] pt-0.5">Coût</span>
              <strong>{session.classType.creditCost} crédit{session.classType.creditCost > 1 ? "s" : ""}</strong>
            </div>
          </div>

          <form action={confirmWaitlistBooking}>
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              className="w-full bg-accent-500 text-cream-50 py-4 text-[11px] uppercase tracking-[0.2em] font-semibold hover:bg-accent-600 transition-colors"
            >
              Confirmer ma réservation
            </button>
          </form>

          <p className="text-xs text-stone2-400 text-center mt-4">
            Un crédit sera débité de votre solde à la confirmation.
            <br />Si vous ne confirmez pas, la place sera proposée au membre suivant.
          </p>
        </div>
      </div>
    </div>
  );
}
