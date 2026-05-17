// Abstracted email service.
// In dev: logs to console. In prod: set RESEND_API_KEY → emails go through Resend.

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

// ─── Brand-consistent HTML wrapper ───────────────────────────────────────────

const baseStyle = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&display=swap');
    body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1C1C1A;background:#F7F3EC;margin:0;padding:24px}
    .card{max-width:580px;margin:auto;background:#fff;border:1px solid #DDD5C5;padding:40px}
    .logo{font-family:'Cormorant Garamond',Georgia,serif;font-size:20px;letter-spacing:0.18em;text-transform:uppercase;color:#1C1C1A;margin-bottom:32px;display:block}
    .title{font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:500;color:#1C1C1A;margin:0 0 20px}
    .btn{display:inline-block;background:#1C1C1A;color:#FAF7F1;padding:14px 28px;text-decoration:none;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;font-weight:600}
    .btn-accent{background:#A07B3A;color:#FAF7F1}
    .detail-row{display:flex;gap:8px;padding:8px 0;border-bottom:1px solid #EAE3D4;font-size:14px}
    .detail-label{color:#6E6555;min-width:100px;font-size:12px;text-transform:uppercase;letter-spacing:0.1em}
    .muted{color:#6E6555;font-size:13px}
    .divider{border:none;border-top:1px solid #EAE3D4;margin:24px 0}
    .highlight{background:#F2EDE2;border-left:3px solid #A07B3A;padding:12px 16px;margin:16px 0;font-size:14px}
    .footer{max-width:580px;margin:16px auto 0;color:#928775;font-size:11px;text-align:center;letter-spacing:0.1em;text-transform:uppercase}
  </style>
`;

function wrap(title: string, body: string) {
  const site = siteUrl();
  return `<!doctype html><html><head>${baseStyle}</head><body>
    <div class="card">
      <a class="logo" href="${site}">Ilannatek</a>
      <h1 class="title">${title}</h1>
      ${body}
    </div>
    <p class="footer">Studio Boutique · <a href="${site}" style="color:#928775">${site.replace("https://", "").replace("http://", "")}</a></p>
  </body></html>`;
}

// ─── Templates ───────────────────────────────────────────────────────────────

export const emailTemplates = {
  welcome: (firstName: string) => ({
    subject: `Bienvenue chez Ilannatek, ${firstName}`,
    html: wrap(
      `Bienvenue, ${firstName}`,
      `<p>Votre compte est créé. Consultez le planning et réservez vos premiers cours.</p>
       <div class="highlight">Votre solde de démarrage a été crédité — vérifiez votre compte.</div>
       <p style="margin-top:24px"><a class="btn" href="${siteUrl()}/schedule">Voir le planning →</a></p>`
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
      `${args.className}`,
      `<p>Bonjour ${args.firstName}, votre place est confirmée.</p>
       <div style="margin:20px 0">
         <div class="detail-row"><span class="detail-label">Date</span><strong>${args.startTime.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</strong></div>
         <div class="detail-row"><span class="detail-label">Heure</span><strong>${args.startTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</strong></div>
         <div class="detail-row"><span class="detail-label">Studio</span><strong>${args.location}</strong></div>
         <div class="detail-row" style="border:none"><span class="detail-label">Instructeur</span><strong>${args.instructor}</strong></div>
       </div>
       <p style="margin-top:24px"><a class="btn" href="${siteUrl()}/account">Voir mes réservations →</a></p>
       <hr class="divider"/>
       <p class="muted">Annulation gratuite jusqu'à 2h avant le cours depuis votre espace.</p>`
    ),
  }),

  bookingWaitlisted: (args: {
    firstName: string;
    className: string;
    position: number;
  }) => ({
    subject: `Liste d'attente #${args.position} — ${args.className}`,
    html: wrap(
      `Liste d'attente`,
      `<p>Bonjour ${args.firstName},</p>
       <p>Le cours <strong>${args.className}</strong> est complet.</p>
       <div class="highlight">Vous êtes en position <strong>#${args.position}</strong> sur la liste d'attente. Nous vous prévenons immédiatement si une place se libère.</div>
       <p style="margin-top:24px"><a class="btn" href="${siteUrl()}/account">Mon espace →</a></p>`
    ),
  }),

  promotedFromWaitlist: (args: {
    firstName: string;
    className: string;
    startTime: Date;
  }) => ({
    subject: `Place obtenue — ${args.className} 🎉`,
    html: wrap(
      `Bonne nouvelle !`,
      `<p>Bonjour ${args.firstName},</p>
       <p>Une place s'est libérée pour <strong>${args.className}</strong>.</p>
       <div class="highlight">
         <strong>Vous êtes inscrit·e</strong> — ${args.startTime.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à ${args.startTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
       </div>
       <p>Un crédit a été débité de votre solde.</p>
       <p style="margin-top:24px"><a class="btn" href="${siteUrl()}/account">Voir ma réservation →</a></p>`
    ),
  }),

  bookingCancelled: (args: {
    firstName: string;
    className: string;
    refunded: number;
    feeApplied?: number;
  }) => ({
    subject: `Annulation — ${args.className}`,
    html: wrap(
      `Réservation annulée`,
      `<p>Bonjour ${args.firstName},</p>
       <p>Votre réservation pour <strong>${args.className}</strong> est annulée.</p>
       ${args.refunded > 0 ? `<div class="highlight">✓ ${args.refunded} crédit${args.refunded > 1 ? "s" : ""} recrédité${args.refunded > 1 ? "s" : ""} sur votre solde.</div>` : ""}
       ${args.feeApplied && args.feeApplied > 0 ? `<p class="muted">Frais d'annulation tardive : ${args.feeApplied} crédit${args.feeApplied > 1 ? "s" : ""} retenus.</p>` : ""}
       <p style="margin-top:24px"><a class="btn" href="${siteUrl()}/schedule">Voir le planning →</a></p>`
    ),
  }),

  noShowFee: (args: {
    firstName: string;
    className: string;
    fee: number;
    newBalance: number;
  }) => ({
    subject: `Frais d'absence — ${args.className}`,
    html: wrap(
      `Frais d'absence`,
      `<p>Bonjour ${args.firstName},</p>
       <p>Vous étiez inscrit·e à <strong>${args.className}</strong> mais ne vous êtes pas présenté·e.</p>
       <div class="highlight">
         ${args.fee} crédit${args.fee > 1 ? "s" : ""} de frais d'absence ont été retenus.<br/>
         <span class="muted">Solde actuel : ${args.newBalance} crédit${args.newBalance !== 1 ? "s" : ""}</span>
       </div>
       <p><a class="btn" href="${siteUrl()}/packs">Recharger mes crédits →</a></p>
       <hr class="divider"/>
       <p class="muted">Pour éviter ces frais, annulez votre réservation au moins 2h avant le cours.</p>`
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
      `Reçu d'achat`,
      `<p>Bonjour ${args.firstName}, merci pour votre achat.</p>
       <div style="margin:20px 0">
         <div class="detail-row"><span class="detail-label">Produit</span><strong>${args.planName}</strong></div>
         <div class="detail-row"><span class="detail-label">Montant</span><strong>${(args.amountCents / 100).toFixed(2)} €</strong></div>
         ${args.creditsAdded ? `<div class="detail-row" style="border:none"><span class="detail-label">Crédits</span><strong>+${args.creditsAdded} crédits</strong></div>` : ""}
       </div>
       <p style="margin-top:24px"><a class="btn" href="${siteUrl()}/schedule">Réserver un cours →</a></p>`
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
      `À demain !`,
      `<p>Bonjour ${args.firstName},</p>
       <div class="highlight">
         <strong>${args.className}</strong><br/>
         ${args.startTime.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à ${args.startTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}<br/>
         📍 ${args.location}
       </div>
       <p><a class="btn" href="${siteUrl()}/account">Mon espace →</a></p>`
    ),
  }),

  subscriptionExpiringSoon: (args: {
    firstName: string;
    planName: string;
    endDate: Date;
    daysLeft: number;
  }) => ({
    subject: `Votre abonnement expire dans ${args.daysLeft} jours`,
    html: wrap(
      `Renouvellement à venir`,
      `<p>Bonjour ${args.firstName},</p>
       <p>Votre abonnement <strong>${args.planName}</strong> expire le <strong>${args.endDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</strong>.</p>
       <div class="highlight">Il vous reste <strong>${args.daysLeft} jour${args.daysLeft > 1 ? "s" : ""}</strong> pour continuer à profiter de vos crédits.</div>
       <p style="margin-top:24px"><a class="btn" href="${siteUrl()}/subscriptions">Renouveler mon abonnement →</a></p>`
    ),
  }),

  instructorNewBooking: (args: {
    instructorFirstName: string;
    memberFirstName: string;
    memberLastName: string;
    className: string;
    startTime: Date;
    location: string;
    confirmedCount: number;
    capacity: number;
  }) => ({
    subject: `Nouvelle inscription — ${args.className}`,
    html: wrap(
      `Nouvelle inscription`,
      `<p>Bonjour ${args.instructorFirstName},</p>
       <p><strong>${args.memberFirstName} ${args.memberLastName}</strong> vient de s'inscrire à votre cours.</p>
       <div style="margin:20px 0">
         <div class="detail-row"><span class="detail-label">Cours</span><strong>${args.className}</strong></div>
         <div class="detail-row"><span class="detail-label">Date</span><strong>${args.startTime.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à ${args.startTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</strong></div>
         <div class="detail-row" style="border:none"><span class="detail-label">Inscrits</span><strong>${args.confirmedCount} / ${args.capacity}</strong></div>
       </div>
       <p style="margin-top:24px"><a class="btn" href="${siteUrl()}/instructor">Voir mes cours →</a></p>`
    ),
  }),

  subscriptionCancelled: (args: { firstName: string; planName: string }) => ({
    subject: `Abonnement annulé — ${args.planName}`,
    html: wrap(
      `Abonnement annulé`,
      `<p>Bonjour ${args.firstName},</p>
       <p>Votre abonnement <strong>${args.planName}</strong> a été annulé. Vos crédits restants sont conservés.</p>
       <p style="margin-top:24px"><a class="btn" href="${siteUrl()}/subscriptions">Voir nos abonnements →</a></p>`
    ),
  }),

  paymentFailed: (args: { firstName: string; planName: string }) => ({
    subject: `Échec du paiement — ${args.planName}`,
    html: wrap(
      `Échec du paiement`,
      `<p>Bonjour ${args.firstName},</p>
       <p>Le renouvellement de votre abonnement <strong>${args.planName}</strong> n'a pas pu être débité.</p>
       <div class="highlight">Votre abonnement a été suspendu. Mettez à jour votre moyen de paiement pour continuer à profiter du studio.</div>
       <p style="margin-top:24px"><a class="btn btn-accent" href="${siteUrl()}/subscriptions">Mettre à jour mon paiement →</a></p>`
    ),
  }),

  sessionCancelledByStudio: (args: {
    firstName: string;
    className: string;
    startTime: Date;
    creditsRefunded: number;
  }) => ({
    subject: `Séance annulée — ${args.className}`,
    html: wrap(
      `Séance annulée`,
      `<p>Bonjour ${args.firstName},</p>
       <p>Nous avons dû annuler la séance suivante :</p>
       <div style="margin:20px 0">
         <div class="detail-row"><span class="detail-label">Cours</span><strong>${args.className}</strong></div>
         <div class="detail-row" style="border:none"><span class="detail-label">Date</span><strong>${args.startTime.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à ${args.startTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</strong></div>
       </div>
       ${args.creditsRefunded > 0 ? `<div class="highlight">✓ ${args.creditsRefunded} crédit${args.creditsRefunded > 1 ? "s" : ""} recrédité${args.creditsRefunded > 1 ? "s" : ""} sur votre solde.</div>` : ""}
       <p class="muted">Nous vous présentons toutes nos excuses pour la gêne occasionnée.</p>
       <p style="margin-top:24px"><a class="btn" href="${siteUrl()}/schedule">Voir le planning →</a></p>`
    ),
  }),

  passwordReset: (args: { firstName: string; resetUrl: string }) => ({
    subject: "Réinitialisation de votre mot de passe",
    html: wrap(
      `Réinitialiser votre mot de passe`,
      `<p>Bonjour ${args.firstName},</p>
       <p>Vous avez demandé à réinitialiser votre mot de passe. Ce lien expire dans <strong>1 heure</strong>.</p>
       <p style="margin-top:24px"><a class="btn" href="${args.resetUrl}">Choisir un nouveau mot de passe →</a></p>
       <hr class="divider"/>
       <p class="muted">Si vous n'avez pas fait cette demande, ignorez cet email.</p>`
    ),
  }),

  subscriptionFrozen: (args: { firstName: string; planName: string }) => ({
    subject: `Abonnement mis en pause — ${args.planName}`,
    html: wrap(
      `Abonnement mis en pause`,
      `<p>Bonjour ${args.firstName},</p>
       <p>Votre abonnement <strong>${args.planName}</strong> est mis en pause. Il ne sera pas renouvelé tant qu'il reste gelé.</p>
       <p style="margin-top:24px"><a class="btn" href="${siteUrl()}/account">Reprendre mon abonnement →</a></p>`
    ),
  }),

  subscriptionResumed: (args: { firstName: string; planName: string; endDate: Date }) => ({
    subject: `Abonnement repris — ${args.planName}`,
    html: wrap(
      `Abonnement repris`,
      `<p>Bonjour ${args.firstName},</p>
       <p>Votre abonnement <strong>${args.planName}</strong> est à nouveau actif jusqu'au <strong>${args.endDate.toLocaleDateString("fr-FR")}</strong>.</p>
       <p style="margin-top:24px"><a class="btn" href="${siteUrl()}/schedule">Voir le planning →</a></p>`
    ),
  }),
};

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}
