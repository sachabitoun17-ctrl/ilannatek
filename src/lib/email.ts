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

// ─── HTML helpers ───────────────────────────────────────────────────────────────

/** Escape user-controlled strings for safe HTML interpolation. */
function esc(s: string | undefined | null): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

// ─── Templates ──────────────────────────────────────────────────────────────────────

export const emailTemplates = {
  welcome: (firstName: string) => ({
    subject: `Bienvenue chez Ilannatek, ${firstName}`,
    html: wrap(
      `Bienvenue, ${esc(firstName)}`,
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
      `<p>Bonjour ${esc(args.firstName)}, votre place est confirmée.</p>
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
      `<p>Bonjour ${esc(args.firstName)},</p>
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
    subject: `Place obtenue — ${args.className}`,
    html: wrap(
      `Bonne nouvelle !`,
      `<p>Bonjour ${esc(args.firstName)},</p>
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
      `<p>Bonjour ${esc(args.firstName)},</p>
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
      `<p>Bonjour ${esc(args.firstName)},</p>
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
      `<p>Bonjour ${esc(args.firstName)}, merci pour votre achat.</p>
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
      `<p>Bonjour ${esc(args.firstName)},</p>
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
      `<p>Bonjour ${esc(args.firstName)},</p>
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
      `<p>Bonjour ${esc(args.instructorFirstName)},</p>
       <p><strong>${esc(args.memberFirstName)} ${esc(args.memberLastName)}</strong> vient de s'inscrire à votre cours.</p>
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
      `<p>Bonjour ${esc(args.firstName)},</p>
       <p>Votre abonnement <strong>${args.planName}</strong> a été annulé. Vos crédits restants sont conservés.</p>
       <p style="margin-top:24px"><a class="btn" href="${siteUrl()}/subscriptions">Voir nos abonnements →</a></p>`
    ),
  }),

  paymentFailed: (args: { firstName: string; planName: string }) => ({
    subject: `Échec du paiement — ${args.planName}`,
    html: wrap(
      `Échec du paiement`,
      `<p>Bonjour ${esc(args.firstName)},</p>
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
      `<p>Bonjour ${esc(args.firstName)},</p>
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
      `<p>Bonjour ${esc(args.firstName)},</p>
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
      `<p>Bonjour ${esc(args.firstName)},</p>
       <p>Votre abonnement <strong>${args.planName}</strong> est mis en pause. Il ne sera pas renouvelé tant qu'il reste gelé.</p>
       <p style="margin-top:24px"><a class="btn" href="${siteUrl()}/account">Reprendre mon abonnement →</a></p>`
    ),
  }),

  subscriptionResumed: (args: { firstName: string; planName: string; endDate: Date }) => ({
    subject: `Abonnement repris — ${args.planName}`,
    html: wrap(
      `Abonnement repris`,
      `<p>Bonjour ${esc(args.firstName)},</p>
       <p>Votre abonnement <strong>${args.planName}</strong> est à nouveau actif jusqu'au <strong>${args.endDate.toLocaleDateString("fr-FR")}</strong>.</p>
       <p style="margin-top:24px"><a class="btn" href="${siteUrl()}/schedule">Voir le planning →</a></p>`
    ),
  }),

  friendInvite: (args: { fromName: string; toEmail: string; acceptUrl: string }) => ({
    subject: `${args.fromName} vous invite à rejoindre Ilannatek`,
    html: wrap(
      `Vous êtes invité·e !`,
      `<p>Bonjour,</p>
       <p><strong>${esc(args.fromName)}</strong> vous invite à rejoindre le studio Ilannatek.</p>
       <div class="highlight">
         <strong>Offre spéciale :</strong> créez votre compte via ce lien et recevez <strong>1 crédit offert</strong> pour votre premier cours.<br/>
         <span class="muted">${esc(args.fromName)} en recevra un aussi — une façon de venir en duo !</span>
       </div>
       <p style="margin-top:28px;text-align:center">
         <a class="btn btn-accent" href="${args.acceptUrl}" style="font-size:13px;padding:16px 36px">Créer mon compte et obtenir mon crédit →</a>
       </p>
       <hr class="divider"/>
       <p class="muted">Cette invitation est valable 30 jours. Si vous avez déjà un compte, connectez-vous directement.</p>`
    ),
  }),

  waitlistSpotAvailable: (args: {
    firstName: string;
    className: string;
    startTime: Date;
    location: string;
    acceptUrl: string;
  }) => ({
    subject: `Une place s'est libérée — ${args.className}`,
    html: wrap(
      `Bonne nouvelle !`,
      `<p>Bonjour ${esc(args.firstName)},</p>
       <p>Une place vient de se libérer pour <strong>${args.className}</strong>.</p>
       <div class="highlight">
         Vous avez <strong>30 minutes</strong> pour confirmer votre présence.<br/>
         Passé ce délai, la place sera proposée au membre suivant.
       </div>
       <div style="margin:20px 0">
         <div class="detail-row"><span class="detail-label">Cours</span><strong>${args.className}</strong></div>
         <div class="detail-row"><span class="detail-label">Date</span><strong>${args.startTime.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</strong></div>
         <div class="detail-row"><span class="detail-label">Heure</span><strong>${args.startTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</strong></div>
         <div class="detail-row" style="border:none"><span class="detail-label">Studio</span><strong>${args.location}</strong></div>
       </div>
       <p style="margin-top:28px;text-align:center">
         <a class="btn btn-accent" href="${args.acceptUrl}" style="font-size:13px;padding:16px 36px">Confirmer ma réservation →</a>
       </p>
       <hr class="divider"/>
       <p class="muted">Si vous ne confirmez pas dans les 30 minutes, votre place sera automatiquement libérée et proposée au membre suivant sur la liste d'attente.</p>`
    ),
  }),

  // ─── ONBOARDING DRIP ─────────────────────────────────────────────────────────────

  onboardingNudge: (args: { firstName: string; creditsBalance: number }) => ({
    subject: `${args.firstName}, votre crédit attend son premier cours`,
    html: wrap(
      `Votre crédit vous attend`,
      `<p>Bonjour ${esc(args.firstName)},</p>
       <p>Vous vous êtes inscrit·e hier — bienvenue à nouveau. Vous avez <strong>${args.creditsBalance} crédit${args.creditsBalance > 1 ? "s" : ""}</strong> sur votre compte, prêt à être utilisé.</p>
       <div class="highlight">Le premier cours est souvent le plus difficile à planifier. Parcourez le planning — des créneaux sont disponibles dès aujourd'hui.</div>
       <p style="margin:24px 0"><a class="btn btn-accent" href="${siteUrl()}/schedule">Trouver mon premier cours →</a></p>
       <hr class="divider"/>
       <p class="muted">Annulation gratuite jusqu'à 2h avant. Aucun engagement.</p>`
    ),
    text: `Bonjour ${args.firstName}, votre crédit de bienvenue vous attend. Réservez votre premier cours : ${siteUrl()}/schedule`,
  }),

  onboardingLastCall: (args: { firstName: string }) => ({
    subject: `${args.firstName} — votre place au studio vous attend encore`,
    html: wrap(
      `C'est le moment`,
      `<p>Bonjour ${esc(args.firstName)},</p>
       <p>Cela fait quelques jours depuis votre inscription. Votre crédit est toujours là.</p>
       <div class="highlight">Commencez par un cours découverte — conçus pour tous les niveaux, ils vous donneront une idée claire de ce qui vous convient.</div>
       <p>Le planning est mis à jour en continu. Filtrez par discipline, par horaire ou par instructeur.</p>
       <p style="margin:24px 0"><a class="btn btn-accent" href="${siteUrl()}/schedule">Voir les cours disponibles →</a></p>
       <hr class="divider"/>
       <p class="muted">Des questions avant de commencer ? Répondez directement à cet email.</p>`
    ),
    text: `Bonjour ${args.firstName}, votre crédit de bienvenue vous attend toujours. Réservez sur ${siteUrl()}/schedule`,
  }),

  // ─── RAPPEL 2H ────────────────────────────────────────────────────────────────────────

  reminder2h: (args: {
    firstName: string;
    className: string;
    startTime: Date;
    location: string;
    locationAddress?: string | null;
  }) => ({
    subject: `Dans 2h : ${args.className}`,
    html: wrap(
      `C'est dans 2h`,
      `<p>Bonjour ${esc(args.firstName)}, votre cours commence bientôt.</p>
       <div class="highlight">
         <strong>${args.className}</strong><br/>
         ${args.startTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} aujourd'hui · ${args.location}
         ${args.locationAddress ? `<br/><span class="muted">${args.locationAddress}</span>` : ""}
       </div>
       <p class="muted" style="margin-top:16px">Prévoyez d'arriver 5 à 10 minutes avant le début.</p>
       <p style="margin-top:24px"><a class="btn" href="${siteUrl()}/account">Mon espace →</a></p>
       <hr class="divider"/>
       <p class="muted">Délai d'annulation dépassé — merci de prévenir le studio directement si vous ne pouvez pas venir.</p>`
    ),
    text: `Bonjour ${args.firstName}, votre cours ${args.className} commence dans 2h à ${args.location}. À tout à l'heure !`,
  }),

  // ─── POST-COURS ─────────────────────────────────────────────────────────────────────────

  postClassThankYou: (args: {
    firstName: string;
    className: string;
    instructor: string;
    totalAttended: number;
    creditsRemaining: number;
  }) => ({
    subject: `Bravo pour aujourd'hui, ${args.firstName}`,
    html: wrap(
      `Bien joué !`,
      `<p>Bonjour ${esc(args.firstName)},</p>
       <p>Merci d'avoir été là pour <strong>${args.className}</strong> avec ${args.instructor}.</p>
       <div class="highlight">
         ${args.totalAttended >= 10
           ? `<strong>${args.totalAttended} cours</strong> au total — vous faites partie de nos membres les plus réguliers.`
           : `Vous avez déjà suivi <strong>${args.totalAttended} cours</strong> chez nous. Continuez comme ça !`
         }
       </div>
       <p>Il vous reste <strong>${args.creditsRemaining} crédit${args.creditsRemaining !== 1 ? "s" : ""}</strong>.</p>
       <p style="margin:24px 0"><a class="btn" href="${siteUrl()}/schedule">Réserver le prochain →</a></p>
       ${args.creditsRemaining <= 1 ? `<hr class="divider"/><p class="muted">Presque à court de crédits ? <a href="${siteUrl()}/packs" style="color:#A07B3A">Voir les packs →</a></p>` : ""}`
    ),
    text: `Bravo ${args.firstName} pour votre cours ${args.className} ! ${args.totalAttended} cours au total. Il vous reste ${args.creditsRemaining} crédit(s). Réservez sur ${siteUrl()}/schedule`,
  }),

  // ─── CRÉDITS ──────────────────────────────────────────────────────────────────────────

  lowCredits: (args: { firstName: string; creditsRemaining: number }) => ({
    subject: `Il vous reste ${args.creditsRemaining} crédit — pensez à recharger`,
    html: wrap(
      `Votre solde est bas`,
      `<p>Bonjour ${esc(args.firstName)},</p>
       <p>Il ne vous reste que <strong>${args.creditsRemaining} crédit</strong> sur votre compte.</p>
       <div class="highlight">Rechargez maintenant pour ne pas manquer vos prochains cours. Les packs sont disponibles sans abonnement.</div>
       <div style="margin:20px 0;border:1px solid #DDD5C5;padding:20px">
         <p style="margin:0 0 12px;font-size:12px;text-transform:uppercase;letter-spacing:0.15em;color:#6E6555">Deux options</p>
         <table width="100%" cellpadding="0" cellspacing="0">
           <tr>
             <td width="48%" style="vertical-align:top;padding-right:12px">
               <p style="font-weight:600;margin:0 0 4px;color:#1C1C1A">Pack ponctuel</p>
               <p style="font-size:13px;color:#6E6555;margin:0">Flexibilité totale, sans engagement</p>
             </td>
             <td width="4%" style="border-left:1px solid #EAE3D4"></td>
             <td width="48%" style="vertical-align:top;padding-left:12px">
               <p style="font-weight:600;margin:0 0 4px;color:#A07B3A">Abonnement mensuel</p>
               <p style="font-size:13px;color:#6E6555;margin:0">Jusqu'à 40% plus économique</p>
             </td>
           </tr>
         </table>
       </div>
       <p style="margin:20px 0">
         <a class="btn" href="${siteUrl()}/packs" style="margin-right:8px">Packs →</a>
         <a class="btn btn-accent" href="${siteUrl()}/subscriptions">Abonnements →</a>
       </p>`
    ),
    text: `Bonjour ${args.firstName}, il vous reste ${args.creditsRemaining} crédit. Rechargez sur ${siteUrl()}/packs`,
  }),

  noCredits: (args: { firstName: string }) => ({
    subject: `Vos crédits sont épuisés — revenez au studio`,
    html: wrap(
      `Solde épuisé`,
      `<p>Bonjour ${esc(args.firstName)},</p>
       <p>Votre solde de crédits est à zéro. Pour réserver votre prochain cours, rechargez votre compte.</p>
       <div class="highlight">
         <strong>Pack ponctuel</strong> — idéal pour 1 à 2 cours par mois, sans engagement.<br/>
         <strong>Abonnement mensuel</strong> — jusqu'à 40% plus économique pour une pratique régulière.
       </div>
       <p style="margin:24px 0;text-align:center">
         <a class="btn btn-accent" href="${siteUrl()}/packs" style="font-size:13px;padding:16px 32px">Recharger mon compte →</a>
       </p>
       <hr class="divider"/>
       <p class="muted">Besoin d'aide pour choisir ? Répondez à cet email.</p>`
    ),
    text: `Bonjour ${args.firstName}, votre solde est épuisé. Rechargez sur ${siteUrl()}/packs ou abonnez-vous sur ${siteUrl()}/subscriptions`,
  }),

  // ─── RÉTENTION / RÉENGAGEMENT ──────────────────────────────────────────────────────

  reengagement14d: (args: {
    firstName: string;
    creditsBalance: number;
    nextClassName?: string | null;
    nextStartTime?: Date | null;
    nextLocation?: string | null;
  }) => ({
    subject: `${args.firstName}, ça fait 2 semaines…`,
    html: wrap(
      `On ne vous a pas vu`,
      `<p>Bonjour ${esc(args.firstName)},</p>
       <p>Cela fait deux semaines que nous ne vous avons pas vu au studio. Vos <strong>${args.creditsBalance} crédit${args.creditsBalance !== 1 ? "s" : ""}</strong> vous attendent toujours.</p>
       ${args.nextClassName && args.nextStartTime && args.nextLocation ? `
       <div class="highlight">
         <strong>Prochain cours disponible</strong><br/>
         ${args.nextClassName} — ${args.nextStartTime.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à ${args.nextStartTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}<br/>
         ${args.nextLocation}
       </div>` : `<div class="highlight">Consultez le planning — de nouveaux créneaux ont peut-être été ajoutés depuis votre dernière visite.</div>`}
       <p style="margin:24px 0"><a class="btn" href="${siteUrl()}/schedule">Reprendre →</a></p>
       <hr class="divider"/>
       <p class="muted">Vos crédits ne s'expirent pas.</p>`
    ),
    text: `Bonjour ${args.firstName}, cela fait 2 semaines. Vos ${args.creditsBalance} crédit(s) vous attendent sur ${siteUrl()}/schedule`,
  }),

  reengagement30d: (args: { firstName: string; creditsBalance: number }) => ({
    subject: `Votre pratique vous attend, ${args.firstName}`,
    html: wrap(
      `Un mois déjà`,
      `<p>Bonjour ${esc(args.firstName)},</p>
       <p>Cela fait un mois depuis votre dernier cours. La pratique régulière fait toute la différence — et le plus dur c'est souvent de recommencer.</p>
       ${args.creditsBalance > 0
         ? `<div class="highlight">Vous avez encore <strong>${args.creditsBalance} crédit${args.creditsBalance !== 1 ? "s" : ""}</strong> — aucune raison d'attendre.</div>`
         : `<div class="highlight">De nouveaux créneaux en soirée et le week-end viennent d'être ajoutés au planning.</div>`
       }
       <p>Pas de jugement — il suffit d'un cours pour retrouver le rythme.</p>
       <p style="margin:24px 0"><a class="btn btn-accent" href="${siteUrl()}/schedule">Reprendre le planning →</a></p>
       <hr class="divider"/>
       <p class="muted">Abonnement suspendu ? Réactivez-le depuis votre espace en un clic.</p>`
    ),
    text: `Bonjour ${args.firstName}, un mois sans cours. Reprenez sur ${siteUrl()}/schedule — vos ${args.creditsBalance} crédit(s) vous attendent.`,
  }),

  winBack60d: (args: { firstName: string; promoCode?: string | null }) => ({
    subject: `Deux mois — on vous a gardé une place, ${args.firstName}`,
    html: wrap(
      `Revenez, on vous attend`,
      `<p>Bonjour ${esc(args.firstName)},</p>
       <p>Cela fait deux mois depuis votre dernier cours. Votre compte est toujours actif et votre espace vous attend.</p>
       ${args.promoCode
         ? `<div class="highlight"><strong>Pour marquer votre retour</strong> — utilisez le code <strong style="font-size:18px;letter-spacing:0.12em;color:#1C1C1A">${esc(args.promoCode)}</strong> lors de votre prochain achat.</div>`
         : `<div class="highlight">Le planning est renouvelé régulièrement. Nouvelles disciplines, nouveaux créneaux, nouveaux instructeurs.</div>`
       }
       <p style="margin:24px 0;text-align:center">
         <a class="btn btn-accent" href="${siteUrl()}/schedule" style="padding:16px 32px;font-size:13px">Reprendre maintenant →</a>
       </p>
       <hr class="divider"/>
       <p class="muted">Vous ne souhaitez plus recevoir nos emails ? <a href="${siteUrl()}/account/profile" style="color:#928775">Gérer mes préférences</a>.</p>`
    ),
    text: `Bonjour ${args.firstName}, deux mois sans cours. Votre compte vous attend sur ${siteUrl()}/schedule${args.promoCode ? `. Code promo : ${args.promoCode}` : ""}.`,
  }),

  // ─── JALONS ──────────────────────────────────────────────────────────────────────────

  streakMilestone: (args: { firstName: string; totalCourses: number }) => ({
    subject: `${args.totalCourses} cours — vous faites partie des piliers du studio`,
    html: wrap(
      `${args.totalCourses} cours au compteur`,
      `<p>Bonjour ${esc(args.firstName)},</p>
       <p>Vous venez d'atteindre <strong>${args.totalCourses} cours</strong> au studio Ilannatek.</p>
       <div style="text-align:center;padding:32px 0;border:1px solid #DDD5C5;margin:20px 0">
         <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:72px;font-weight:600;color:#A07B3A;margin:0;line-height:1">${args.totalCourses}</p>
         <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.22em;color:#6E6555;margin:10px 0 0">cours suivis</p>
       </div>
       <p>Vous faites partie des membres les plus assidus de notre studio. Merci pour votre fidélité — c'est vous qui faites l'ambiance de chaque cours.</p>
       <p style="margin:24px 0"><a class="btn" href="${siteUrl()}/schedule">Prochains cours →</a></p>`
    ),
    text: `Bravo ${args.firstName} ! Vous avez atteint ${args.totalCourses} cours au studio. Continuez sur ${siteUrl()}/schedule`,
  }),

  // ─── PARRAINAGE ──────────────────────────────────────────────────────────────────────

  referralJoined: (args: {
    firstName: string;
    friendFirstName: string;
    creditsEarned: number;
    newBalance: number;
  }) => ({
    subject: `${args.friendFirstName} a rejoint le studio — +${args.creditsEarned} crédit pour vous`,
    html: wrap(
      `Votre filleul a rejoint le studio !`,
      `<p>Bonjour ${esc(args.firstName)},</p>
       <p><strong>${esc(args.friendFirstName)}</strong> vient de créer son compte chez Ilannatek grâce à votre lien de parrainage.</p>
       <div class="highlight">
         <strong>+${args.creditsEarned} crédit</strong> ajouté à votre compte — merci de faire grandir la communauté.<br/>
         <span class="muted">Solde actuel : ${args.newBalance} crédit${args.newBalance !== 1 ? "s" : ""}</span>
       </div>
       <p>Partagez à nouveau votre lien pour gagner un crédit à chaque nouvel inscrit. Il n'y a pas de limite.</p>
       <p style="margin:24px 0"><a class="btn" href="${siteUrl()}/invite">Partager mon lien →</a></p>`
    ),
    text: `Bravo ${args.firstName} ! ${args.friendFirstName} a rejoint le studio grâce à vous. +${args.creditsEarned} crédit sur votre compte. Solde : ${args.newBalance} crédit(s).`,
  }),

  // ─── ABONNEMENT ──────────────────────────────────────────────────────────────────────

  subscriptionRenewed: (args: {
    firstName: string;
    planName: string;
    creditsAdded: number;
    newEndDate: Date;
    newBalance: number;
  }) => ({
    subject: `Abonnement renouvelé — ${args.planName}`,
    html: wrap(
      `Renouvellement automatique`,
      `<p>Bonjour ${esc(args.firstName)},</p>
       <p>Votre abonnement <strong>${args.planName}</strong> a été renouvelé automatiquement.</p>
       <div style="margin:20px 0">
         <div class="detail-row"><span class="detail-label">Crédits ajoutés</span><strong>+${args.creditsAdded} crédit${args.creditsAdded !== 1 ? "s" : ""}</strong></div>
         <div class="detail-row"><span class="detail-label">Solde actuel</span><strong>${args.newBalance} crédit${args.newBalance !== 1 ? "s" : ""}</strong></div>
         <div class="detail-row" style="border:none"><span class="detail-label">Prochaine échéance</span><strong>${args.newEndDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</strong></div>
       </div>
       <p style="margin-top:24px"><a class="btn" href="${siteUrl()}/schedule">Réserver un cours →</a></p>
       <hr class="divider"/>
       <p class="muted">Pour annuler votre abonnement, rendez-vous dans votre espace membre à tout moment.</p>`
    ),
    text: `Bonjour ${args.firstName}, votre abonnement ${args.planName} a été renouvelé. +${args.creditsAdded} crédit(s). Solde : ${args.newBalance}. Prochaine échéance : ${args.newEndDate.toLocaleDateString("fr-FR")}.`,
  }),

  // ─── COMPTE ──────────────────────────────────────────────────────────────────────────

  accountDeleted: (args: { firstName: string }) => ({
    subject: `Votre compte Ilannatek a été supprimé`,
    html: wrap(
      `Compte supprimé`,
      `<p>Bonjour ${esc(args.firstName)},</p>
       <p>Votre compte Ilannatek a bien été supprimé. Vos données personnelles ont été anonymisées conformément au RGPD (Art. 17).</p>
       <div class="highlight">
         <strong>Supprimé :</strong> nom, prénom, adresse email, téléphone, tokens de session.<br/>
         <strong>Conservé de façon anonyme :</strong> historique comptable (obligation légale 10 ans).
       </div>
       <p class="muted" style="margin-top:16px">Une question ? Écrivez-nous à <a href="mailto:privacy@ilannatek.fr" style="color:#A07B3A">privacy@ilannatek.fr</a>.</p>
       <hr class="divider"/>
       <p class="muted">C'est la dernière communication que vous recevrez de notre part.</p>`
    ),
    text: `Bonjour ${args.firstName}, votre compte Ilannatek a été supprimé. Vos données ont été anonymisées (RGPD Art. 17). Questions : privacy@ilannatek.fr`,
  }),
};

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}
