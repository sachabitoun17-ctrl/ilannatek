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
  }
}

export default async function EmailsPage() {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);

  const keys = Object.keys(emailTemplates) as TemplateKey[];
  const templates = keys.map((k) => {
    const tpl = previewFor(k, user?.firstName ?? "Sasha");
    return {
      key: k,
      label: TEMPLATE_META[k].label,
      description: TEMPLATE_META[k].description,
      trigger: TEMPLATE_META[k].trigger,
      subject: tpl.subject,
      html: tpl.html,
    };
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
            <p className="label">Service d'envoi</p>
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
