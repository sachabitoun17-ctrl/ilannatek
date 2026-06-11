export const dynamic = "force-dynamic";
import { emailTemplates } from "@/lib/email";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import EmailsClient from "./EmailsClient";

type TemplateKey = keyof typeof emailTemplates;

const TEMPLATE_META: Record<
  TemplateKey,
  { label: string; description: string; trigger: string }
> = {
  welcome: {
    label: "Bienvenue",
    description: "Envoyé à la création d'un compte.",
    trigger: "Inscription d'un nouveau membre",
  },
  bookingConfirmed: {
    label: "Réservation confirmée",
    description: "Confirmation immédiate après réservation d'un cours.",
    trigger: "Réservation validée (CONFIRMED)",
  },
  bookingWaitlisted: {
    label: "Liste d'attente",
    description: "Notifie le membre qu'il est inscrit sur liste d'attente.",
    trigger: "Cours complet au moment de la réservation",
  },
  promotedFromWaitlist: {
    label: "Place obtenue",
    description: "Notification de promotion depuis la liste d'attente.",
    trigger: "Une place se libère + le membre a le crédit",
  },
  bookingCancelled: {
    label: "Annulation",
    description: "Confirmation d'annulation, avec ou sans remboursement.",
    trigger: "Annulation par le membre ou par l'admin",
  },
  receipt: {
    label: "Reçu d'achat",
    description: "Reçu après paiement d'un pack ou abonnement.",
    trigger: "Webhook Stripe checkout.session.completed",
  },
  reminder: {
    label: "Rappel J-1",
    description: "Rappel envoyé la veille du cours réservé.",
    trigger: "Cron quotidien (9h)",
  },
  passwordReset: {
    label: "Mot de passe oublié",
    description: "Lien de réinitialisation (valide 1h).",
    trigger: "Demande de réinitialisation",
  },
  subscriptionFrozen: {
    label: "Abonnement gelé",
    description: "Confirmation de mise en pause de l'abonnement.",
    trigger: "Action freeze depuis /account",
  },
  subscriptionResumed: {
    label: "Abonnement repris",
    description: "Confirmation de réactivation de l'abonnement.",
    trigger: "Action unfreeze depuis /account",
  },
  instructorNewBooking: {
    label: "Notif instructeur (réservation)",
    description: "Envoyé à l'instructeur à chaque nouvelle inscription confirmée.",
    trigger: "Réservation confirmée (CONFIRMED)",
  },
  noShowFee: {
    label: "Frais d'absence",
    description: "Frais débités quand un membre ne se présente pas.",
    trigger: "Marquage NO_SHOW par l'instructeur",
  },
  subscriptionExpiringSoon: {
    label: "Expiration proche",
    description: "Avertissement 3 jours avant la fin d'un abonnement sans renouvellement auto.",
    trigger: "Cron abonnements (J-3)",
  },
  subscriptionCancelled: {
    label: "Abonnement annulé",
    description: "Notification quand Stripe annule un abonnement.",
    trigger: "Webhook Stripe customer.subscription.deleted",
  },
  paymentFailed: {
    label: "Échec de paiement",
    description: "Notification quand le renouvellement Stripe échoue.",
    trigger: "Webhook Stripe invoice.payment_failed",
  },
  sessionCancelledByStudio: {
    label: "Séance annulée (studio)",
    description: "Notifie les inscrits quand l'admin annule une séance, avec remboursement des crédits.",
    trigger: "Annulation ou suppression d'une séance par l'admin",
  },
  waitlistSpotAvailable: {
    label: "Place dispo (liste d'attente)",
    description: "Notifie le prochain en liste d'attente — lien d'acceptation valable 30 min.",
    trigger: "Annulation d'une réservation confirmée",
  },
  friendInvite: {
    label: "Invitation ami (Duo)",
    description: "Email envoyé à un ami invité par un membre — contient un lien d'inscription avec crédit offert.",
    trigger: "Envoi d'invitation depuis /invite",
  },
  onboardingNudge: {
    label: "Onboarding J+1",
    description: "Relance un nouveau membre qui n'a pas encore réservé après 1 jour.",
    trigger: "Cron quotidien (J+1 sans réservation)",
  },
  onboardingLastCall: {
    label: "Onboarding J+3",
    description: "Dernier rappel si toujours aucune réservation 3 jours après l'inscription.",
    trigger: "Cron quotidien (J+3 sans réservation)",
  },
  reminder2h: {
    label: "Rappel 2h avant",
    description: "Rappel envoyé 2h avant le début d'un cours confirmé.",
    trigger: "Cron horaire",
  },
  postClassThankYou: {
    label: "Merci après cours",
    description: "Email de remerciement envoyé le matin suivant un cours suivi.",
    trigger: "Cron quotidien (J+1 après cours)",
  },
  lowCredits: {
    label: "Crédits faibles",
    description: "Nudge envoyé aux membres actifs avec 1 crédit restant, sans achat récent.",
    trigger: "Cron quotidien",
  },
  noCredits: {
    label: "Plus de crédits",
    description: "Notification quand le solde tombe à 0.",
    trigger: "Déduction de crédit",
  },
  reengagement14d: {
    label: "Ré-engagement 14j",
    description: "Email avec suggestion de cours pour les membres inactifs depuis 14 jours.",
    trigger: "Cron quotidien (14j sans activité)",
  },
  reengagement30d: {
    label: "Ré-engagement 30j",
    description: "Email motivant pour les membres inactifs depuis 30 jours.",
    trigger: "Cron quotidien (30j sans activité)",
  },
  winBack60d: {
    label: "Win-back 60j",
    description: "Email de récupération avec code promo optionnel après 60 jours d'inactivité.",
    trigger: "Cron quotidien (60j sans activité)",
  },
  streakMilestone: {
    label: "Milestone cours",
    description: "Félicitations à 5, 10, 25, 50, 100 ou 200 cours suivis.",
    trigger: "Cron quotidien (après cours assisté atteignant un palier)",
  },
  referralJoined: {
    label: "Parrainage accepté",
    description: "Notifie le parrain qu'un ami vient de s'inscrire via son lien.",
    trigger: "Inscription via lien de parrainage",
  },
  subscriptionRenewed: {
    label: "Abonnement renouvelé",
    description: "Confirmation de renouvellement automatique avec crédits accordés.",
    trigger: "Cron abonnements (renouvellement local)",
  },
  accountDeleted: {
    label: "Compte supprimé",
    description: "Confirmation RGPD d'anonymisation du compte.",
    trigger: "Action de suppression depuis /account/profile",
  },
  subRequestedToAdmin: {
    label: "Remplacement demandé (admin)",
    description: "Envoyé aux admins quand un instructeur signale une indisponibilité.",
    trigger: "Demande de remplacement depuis /instructor/sub-requests",
  },
  subAssigned: {
    label: "Remplacement assigné (instructeur)",
    description: "Briefing envoyé au remplaçant avec les détails de la séance.",
    trigger: "Assignation d'un remplaçant par l'admin",
  },
  instructorChanged: {
    label: "Changement d'instructeur (membre)",
    description: "Notifie les inscrits que l'instructeur a changé — réservation maintenue.",
    trigger: "Assignation d'un remplaçant par l'admin",
  },
  loginOtp: {
    label: "Code de connexion (2FA admin)",
    description: "Code à 6 chiffres exigé à chaque connexion administrateur.",
    trigger: "Connexion d'un compte ADMIN",
  },
};

function previewFor(key: TemplateKey, firstName: string) {
  switch (key) {
    case "welcome":
      return emailTemplates.welcome(firstName);
    case "bookingConfirmed":
      return emailTemplates.bookingConfirmed({
        firstName,
        className: "Yoga Flow",
        startTime: new Date(Date.now() + 86400000),
        location: "Paris 11ème",
        instructor: "Camille Martin",
      });
    case "bookingWaitlisted":
      return emailTemplates.bookingWaitlisted({
        firstName,
        className: "HIIT Cardio",
        position: 3,
      });
    case "promotedFromWaitlist":
      return emailTemplates.promotedFromWaitlist({
        firstName,
        className: "Pilates Mat",
        startTime: new Date(Date.now() + 86400000),
      });
    case "bookingCancelled":
      return emailTemplates.bookingCancelled({
        firstName,
        className: "Yoga Flow",
        refunded: 1,
      });
    case "receipt":
      return emailTemplates.receipt({
        firstName,
        planName: "Pack 10 cours",
        amountCents: 18000,
        creditsAdded: 10,
      });
    case "reminder":
      return emailTemplates.reminder({
        firstName,
        className: "Indoor Cycling",
        startTime: new Date(Date.now() + 86400000),
        location: "Le Marais",
      });
    case "passwordReset":
      return emailTemplates.passwordReset({
        firstName,
        resetUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/reset-password?token=demo`,
      });
    case "subscriptionFrozen":
      return emailTemplates.subscriptionFrozen({
        firstName,
        planName: "Mensuel illimité",
      });
    case "subscriptionResumed":
      return emailTemplates.subscriptionResumed({
        firstName,
        planName: "Mensuel illimité",
        endDate: new Date(Date.now() + 30 * 86400000),
      });
    case "instructorNewBooking":
      return emailTemplates.instructorNewBooking({
        instructorFirstName: firstName,
        memberFirstName: "Marie",
        memberLastName: "Dupont",
        className: "Yoga Flow",
        startTime: new Date(Date.now() + 86400000),
        location: "Studio Paris 11ème",
        confirmedCount: 8,
        capacity: 12,
      });
    case "noShowFee":
      return emailTemplates.noShowFee({
        firstName,
        className: "Yoga Flow",
        fee: 1,
        newBalance: 4,
      });
    case "subscriptionExpiringSoon":
      return emailTemplates.subscriptionExpiringSoon({
        firstName,
        planName: "Mensuel illimité",
        endDate: new Date(Date.now() + 3 * 86400000),
        daysLeft: 3,
      });
    case "subscriptionCancelled":
      return emailTemplates.subscriptionCancelled({
        firstName,
        planName: "Mensuel illimité",
      });
    case "paymentFailed":
      return emailTemplates.paymentFailed({
        firstName,
        planName: "Mensuel illimité",
      });
    case "sessionCancelledByStudio":
      return emailTemplates.sessionCancelledByStudio({
        firstName,
        className: "Yoga Flow",
        startTime: new Date(Date.now() + 86400000),
        creditsRefunded: 1,
      });
    case "waitlistSpotAvailable":
      return emailTemplates.waitlistSpotAvailable({
        firstName,
        className: "Yoga Flow",
        startTime: new Date(Date.now() + 3600000 * 2),
        location: "Paris 11ème",
        acceptUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/account/waitlist/accept/preview`,
      });
    case "friendInvite":
      return emailTemplates.friendInvite({
        fromName: firstName,
        toEmail: "ami@exemple.fr",
        acceptUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/invite/preview`,
      });
    case "onboardingNudge":
      return emailTemplates.onboardingNudge({ firstName, creditsBalance: 1 });
    case "onboardingLastCall":
      return emailTemplates.onboardingLastCall({ firstName });
    case "reminder2h":
      return emailTemplates.reminder2h({
        firstName,
        className: "Indoor Cycling",
        startTime: new Date(Date.now() + 7200000),
        location: "Le Marais",
        locationAddress: "12 rue de la Roquette, Paris",
      });
    case "postClassThankYou":
      return emailTemplates.postClassThankYou({
        firstName,
        className: "Yoga Flow",
        instructor: "Camille Martin",
        totalAttended: 8,
        creditsRemaining: 3,
      });
    case "lowCredits":
      return emailTemplates.lowCredits({ firstName, creditsRemaining: 1 });
    case "noCredits":
      return emailTemplates.noCredits({ firstName });
    case "reengagement14d":
      return emailTemplates.reengagement14d({
        firstName,
        creditsBalance: 2,
        nextClassName: "Pilates Mat",
        nextStartTime: new Date(Date.now() + 86400000),
        nextLocation: "Studio Oberkampf",
      });
    case "reengagement30d":
      return emailTemplates.reengagement30d({ firstName, creditsBalance: 2 });
    case "winBack60d":
      return emailTemplates.winBack60d({ firstName, promoCode: "RETOUR20" });
    case "streakMilestone":
      return emailTemplates.streakMilestone({ firstName, totalCourses: 10 });
    case "referralJoined":
      return emailTemplates.referralJoined({
        firstName,
        friendFirstName: "Marie",
        creditsEarned: 1,
        newBalance: 5,
      });
    case "subscriptionRenewed":
      return emailTemplates.subscriptionRenewed({
        firstName,
        planName: "Mensuel illimité",
        creditsAdded: 30,
        newEndDate: new Date(Date.now() + 30 * 86400000),
        newBalance: 32,
      });
    case "accountDeleted":
      return emailTemplates.accountDeleted({ firstName });
    case "subRequestedToAdmin":
      return emailTemplates.subRequestedToAdmin({
        requesterName: `${firstName} Martin`,
        className: "Yoga Flow",
        startTime: new Date(Date.now() + 86400000),
        location: "Studio Paris 11ème",
        reason: "Congé maladie",
        confirmedCount: 9,
      });
    case "subAssigned":
      return emailTemplates.subAssigned({
        subFirstName: firstName,
        requesterName: "Camille Martin",
        className: "Yoga Flow",
        startTime: new Date(Date.now() + 86400000),
        location: "Studio Paris 11ème",
        locationAddress: "12 rue de la Roquette",
        confirmedCount: 9,
        capacity: 12,
      });
    case "instructorChanged":
      return emailTemplates.instructorChanged({
        firstName,
        className: "Yoga Flow",
        startTime: new Date(Date.now() + 86400000),
        newInstructorName: "Sophie Dubois",
      });
    case "loginOtp":
      return emailTemplates.loginOtp({ firstName, code: "482913" });
  }
}

export default async function EmailsPage() {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);

  const keys = Object.keys(emailTemplates) as TemplateKey[];
  const templates = keys.flatMap((k) => {
    const tpl = previewFor(k, user?.firstName ?? "Sasha");
    if (!tpl) return [];
    return [{
      key: k,
      label: TEMPLATE_META[k].label,
      description: TEMPLATE_META[k].description,
      trigger: TEMPLATE_META[k].trigger,
      subject: tpl.subject,
      html: tpl.html,
    }];
  });

  const resendConfigured = !!process.env.RESEND_API_KEY;

  return (
    <div className="space-y-6">
      <div>
        <p className="section-title">Communication</p>
        <h1 className="font-serif text-4xl font-medium text-brand-600 mt-1">
          Emails transactionnels
        </h1>
        <p className="text-sm text-stone2-500 mt-2 max-w-2xl">
          Tous les emails envoyés automatiquement par la plateforme. Prévisualisez
          le rendu et envoyez-vous un test sur votre boîte.
        </p>
      </div>

      <div className="card">
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="label">Expéditeur</p>
            <p className="text-brand-600 font-medium">{settings.emailFrom}</p>
            <p className="text-xs text-stone2-400 mt-1">
              Modifiable dans <a href="/admin/settings" className="underline">Paramètres</a>
            </p>
          </div>
          <div>
            <p className="label">Service d&apos;envoi</p>
            {resendConfigured ? (
              <p className="text-brand-600 font-medium">
                <span className="inline-block h-2 w-2 rounded-full bg-green-600 mr-2" />
                Resend connecté
              </p>
            ) : (
              <p className="text-stone2-600 font-medium">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500 mr-2" />
                Mode dev (console.log)
              </p>
            )}
            <p className="text-xs text-stone2-400 mt-1">
              {resendConfigured
                ? "Les emails sont réellement envoyés."
                : "Définir RESEND_API_KEY pour envoyer en réel."}
            </p>
          </div>
        </div>
      </div>

      <EmailsClient templates={templates} adminEmail={user?.email ?? ""} />
    </div>
  );
}
