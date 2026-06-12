"use server";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getSettings } from "@/lib/settings";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function sendReengagementEmailAction(
  userId: string,
  firstName: string,
  email: string,
  tier: "HOT" | "WARM" | "COLD"
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  const settings = await getSettings();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

  const subjects: Record<string, string> = {
    HOT: "Vos crédits vous attendent — revenez nous voir",
    WARM: "On ne vous a pas vu depuis un moment…",
    COLD: "Le studio vous manque ? On est là",
  };
  const openers: Record<string, string> = {
    HOT: `Vos crédits sont toujours là, prêts à être utilisés. On sait que le quotidien peut vite déborder, mais votre bien-être mérite une place dans votre agenda.`,
    WARM: `Ça fait un petit moment qu'on ne vous a pas croisé au studio. Vous nous manquez, et on espère que tout va bien de votre côté.`,
    COLD: `Le studio a évolué depuis votre dernière visite. De nouveaux cours, de nouveaux instructeurs — et toujours la même attention portée à chaque membre.`,
  };

  const subject = subjects[tier];
  const opener = openers[tier];

  const html = `<!doctype html><html><head>
    <style>
      body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1C1C1A;background:#F7F3EC;margin:0;padding:24px}
      .card{max-width:580px;margin:auto;background:#fff;border:1px solid #DDD5C5;padding:40px}
      .logo{font-family:Georgia,serif;font-size:20px;letter-spacing:0.18em;text-transform:uppercase;color:#1C1C1A;margin-bottom:32px;display:block}
      .title{font-family:Georgia,serif;font-size:28px;font-weight:500;color:#1C1C1A;margin:0 0 24px}
      p{margin:0 0 16px;font-size:15px;line-height:1.6;color:#1C1C1A}
      .btn{display:inline-block;background:#1C1C1A;color:#FAF7F1;padding:14px 28px;text-decoration:none;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;font-weight:600}
      .divider{border:none;border-top:1px solid #EAE3D4;margin:24px 0}
      .footer{max-width:580px;margin:16px auto 0;color:#928775;font-size:11px;text-align:center;letter-spacing:0.1em;text-transform:uppercase}
    </style>
  </head><body>
    <div class="card">
      <a class="logo" href="${siteUrl}">${escHtml(settings.studioName)}</a>
      <h1 class="title">${escHtml(subject)}</h1>
      <p>Bonjour ${escHtml(firstName)},</p>
      <p>${escHtml(opener)}</p>
      <p>Réservez votre prochaine séance en quelques clics :</p>
      <p><a class="btn" href="${siteUrl}/schedule">Voir le planning →</a></p>
      <hr class="divider"/>
      <p style="font-size:12px;color:#6E6555">Vous recevez cet email en tant que membre de ${escHtml(settings.studioName)}.</p>
    </div>
    <p class="footer">${escHtml(settings.studioName)} · <a href="${siteUrl}" style="color:#928775">${siteUrl.replace(/https?:\/\//, "")}</a></p>
  </body></html>`;

  await db.emailOutbox.create({
    data: { to: email, subject, html },
  });

  void audit({
    actorId: admin.id,
    action: "ADMIN_SEND_REENGAGEMENT",
    entity: "User",
    entityId: userId,
    metadata: { tier, email },
  });

  return { ok: true };
}
