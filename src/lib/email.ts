// Abstracted email service.
// In dev: logs to console. In prod: set RESEND_API_KEY and emails go through Resend.

import { getSettings } from "./settings";

type SendOpts = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

async function sendViaResend(opts: SendOpts, from: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not set");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}

export async function sendEmail(opts: SendOpts): Promise<void> {
  const settings = await getSettings();
  const from = settings.emailFrom;

  if (process.env.RESEND_API_KEY) {
    try {
      await sendViaResend(opts, from);
      return;
    } catch (err) {
      console.error("[email] Resend failure, falling back to console:", err);
    }
  }
  console.log(
    `[email] to=${opts.to} from=${from} subject="${opts.subject}"\n${opts.text ?? opts.html.slice(0, 200)}`
  );
}

const baseStyle = `
  <style>
    body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;background:#f7f7f8;padding:24px}
    .card{max-width:560px;margin:auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.04)}
    .btn{display:inline-block;background:#db2777;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600}
    .muted{color:#6b7280;font-size:13px}
    h1{font-size:22px;margin:0 0 12px}
  </style>
`;

function wrap(title: string, body: string) {
  return `<!doctype html><html><head>${baseStyle}</head><body><div class="card"><h1>${title}</h1>${body}</div></body></html>`;
}

export const emailTemplates = {
  welcome: (firstName: string) => ({
    subject: "Bienvenue chez Ilannatek",
    html: wrap(
      `Bienvenue ${firstName} 👋`,
      `<p>Votre compte est créé. Vous pouvez dès à présent consulter le planning et réserver vos cours.</p>
       <p><a class="btn" href="${siteUrl()}/schedule">Voir le planning</a></p>`
    ),
  }),

  bookingConfirmed: (args: {
    firstName: string;
    className: string;
    startTime: Date;
    location: string;
    instructor: string;
  }) => ({
    subject: `Réservation confirmée — ${args.className}`,
    html: wrap(
      "Réservation confirmée ✓",
      `<p>Bonjour ${args.firstName},</p>
       <p>Votre place pour <strong>${args.className}</strong> est confirmée.</p>
       <ul>
         <li>📅 ${args.startTime.toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}</li>
         <li>📍 ${args.location}</li>
         <li>👤 ${args.instructor}</li>
       </ul>
       <p><a class="btn" href="${siteUrl()}/account">Voir mes réservations</a></p>
       <p class="muted">Vous pouvez annuler jusqu'à 2h avant le cours.</p>`
    ),
  }),

  bookingWaitlisted: (args: {
    firstName: string;
    className: string;
    position: number;
  }) => ({
    subject: `Liste d'attente — ${args.className}`,
    html: wrap(
      "Vous êtes sur liste d'attente",
      `<p>Bonjour ${args.firstName},</p>
       <p>Le cours <strong>${args.className}</strong> est complet. Vous êtes en position <strong>#${args.position}</strong>.
       Nous vous prévenons dès qu'une place se libère.</p>`
    ),
  }),

  promotedFromWaitlist: (args: {
    firstName: string;
    className: string;
    startTime: Date;
  }) => ({
    subject: `Place obtenue — ${args.className}`,
    html: wrap(
      "Bonne nouvelle ! 🎉",
      `<p>Bonjour ${args.firstName},</p>
       <p>Une place s'est libérée pour <strong>${args.className}</strong> le ${args.startTime.toLocaleString(
         "fr-FR",
         { dateStyle: "full", timeStyle: "short" }
       )}.</p>
       <p>Votre crédit a été utilisé et votre réservation est confirmée.</p>`
    ),
  }),

  bookingCancelled: (args: {
    firstName: string;
    className: string;
    refunded: number;
  }) => ({
    subject: `Annulation confirmée — ${args.className}`,
    html: wrap(
      "Annulation confirmée",
      `<p>Bonjour ${args.firstName},</p>
       <p>Votre réservation pour <strong>${args.className}</strong> est annulée.</p>
       ${args.refunded > 0 ? `<p>${args.refunded} crédit(s) recrédité(s) sur votre solde.</p>` : ""}`
    ),
  }),

  receipt: (args: {
    firstName: string;
    planName: string;
    amountCents: number;
    creditsAdded?: number;
  }) => ({
    subject: `Reçu — ${args.planName}`,
    html: wrap(
      "Reçu d'achat",
      `<p>Bonjour ${args.firstName},</p>
       <p>Merci pour votre achat :</p>
       <ul>
         <li>Produit : <strong>${args.planName}</strong></li>
         <li>Montant : <strong>${(args.amountCents / 100).toFixed(2)} €</strong></li>
         ${args.creditsAdded ? `<li>Crédits ajoutés : <strong>${args.creditsAdded}</strong></li>` : ""}
       </ul>`
    ),
  }),

  reminder: (args: {
    firstName: string;
    className: string;
    startTime: Date;
    location: string;
  }) => ({
    subject: `Rappel — ${args.className} demain`,
    html: wrap(
      "À demain !",
      `<p>Bonjour ${args.firstName},</p>
       <p>Petit rappel pour <strong>${args.className}</strong> le ${args.startTime.toLocaleString(
         "fr-FR",
         { dateStyle: "full", timeStyle: "short" }
       )} à ${args.location}.</p>`
    ),
  }),

  passwordReset: (args: { firstName: string; resetUrl: string }) => ({
    subject: "Réinitialisation de votre mot de passe",
    html: wrap(
      "Réinitialiser votre mot de passe",
      `<p>Bonjour ${args.firstName},</p>
       <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous — ce lien expire dans 1 heure.</p>
       <p><a class="btn" href="${args.resetUrl}">Choisir un nouveau mot de passe</a></p>
       <p class="muted">Si vous n'avez pas fait cette demande, ignorez cet email.</p>`
    ),
  }),

  subscriptionFrozen: (args: { firstName: string; planName: string }) => ({
    subject: `Abonnement mis en pause — ${args.planName}`,
    html: wrap(
      "Abonnement mis en pause",
      `<p>Bonjour ${args.firstName},</p>
       <p>Votre abonnement <strong>${args.planName}</strong> est mis en pause. Il ne sera pas renouvellé tant qu'il est gelé.</p>
       <p><a class="btn" href="${siteUrl()}/account">Reprendre mon abonnement</a></p>`
    ),
  }),

  subscriptionResumed: (args: { firstName: string; planName: string; endDate: Date }) => ({
    subject: `Abonnement repris — ${args.planName}`,
    html: wrap(
      "Abonnement repris",
      `<p>Bonjour ${args.firstName},</p>
       <p>Votre abonnement <strong>${args.planName}</strong> est à nouveau actif jusqu'au ${args.endDate.toLocaleDateString("fr-FR")}.</p>`
    ),
  }),
};

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}
