"use server";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { audit } from "@/lib/audit";
import { getSettings } from "@/lib/settings";

function buildBroadcastHtml(subject: string, body: string, from: string, siteUrl: string): string {
  const paragraphs = body
    .split("\n\n")
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1C1C1A">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");

  return `<!doctype html><html><head>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&display=swap');
      body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1C1C1A;background:#F7F3EC;margin:0;padding:24px}
      .card{max-width:580px;margin:auto;background:#fff;border:1px solid #DDD5C5;padding:40px}
      .logo{font-family:'Cormorant Garamond',Georgia,serif;font-size:20px;letter-spacing:0.18em;text-transform:uppercase;color:#1C1C1A;margin-bottom:32px;display:block}
      .title{font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:500;color:#1C1C1A;margin:0 0 24px}
      .btn{display:inline-block;background:#1C1C1A;color:#FAF7F1;padding:14px 28px;text-decoration:none;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;font-weight:600}
      .divider{border:none;border-top:1px solid #EAE3D4;margin:24px 0}
      .footer{max-width:580px;margin:16px auto 0;color:#928775;font-size:11px;text-align:center;letter-spacing:0.1em;text-transform:uppercase}
    </style>
  </head><body>
    <div class="card">
      <a class="logo" href="${siteUrl}">Ilannatek</a>
      <h1 class="title">${subject}</h1>
      ${paragraphs}
      <hr class="divider"/>
      <p style="font-size:12px;color:#6E6555">Vous recevez cet email en tant que membre du studio Ilannatek.</p>
    </div>
    <p class="footer">Studio Boutique · <a href="${siteUrl}" style="color:#928775">${siteUrl.replace(/https?:\/\//, "")}</a></p>
  </body></html>`;
}

export async function broadcastEmailAction(formData: FormData) {
  const admin = await requireAdmin();
  const subject = (formData.get("subject") as string)?.trim();
  const body = (formData.get("body") as string)?.trim();
  const audience = formData.get("audience") as string;

  if (!subject || !body) return { ok: false as const, error: "Sujet et message requis" };
  if (subject.length > 200) return { ok: false as const, error: "Sujet trop long" };
  if (body.length > 10000) return { ok: false as const, error: "Message trop long" };

  const settings = await getSettings();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // Build recipient list based on audience
  let whereClause: Record<string, unknown> = { active: true };
  if (audience === "zero_credits") {
    whereClause = { active: true, creditsBalance: 0 };
  } else if (audience === "active_sub") {
    whereClause = { active: true, subscriptions: { some: { status: "ACTIVE", endDate: { gt: new Date() } } } };
  } else if (audience === "no_sub") {
    whereClause = { active: true, subscriptions: { none: { status: "ACTIVE", endDate: { gt: new Date() } } } };
  }

  const members = await db.user.findMany({
    where: { ...whereClause, role: { in: ["MEMBER", "INSTRUCTOR"] } },
    select: { id: true, email: true, firstName: true },
  });

  if (members.length === 0) {
    return { ok: false as const, error: "Aucun destinataire correspondant" };
  }

  const html = buildBroadcastHtml(subject, body, settings.emailFrom, siteUrl);

  let sent = 0;
  let failed = 0;
  for (const member of members) {
    try {
      await sendEmail({ to: member.email, subject, html });
      sent++;
    } catch {
      failed++;
    }
  }

  void audit({
    actorId: admin.id,
    action: "ADMIN_BROADCAST_EMAIL",
    entity: "Email",
    metadata: { subject, audience, sent, failed, total: members.length },
  });

  return {
    ok: true as const,
    message: `Email envoyé à ${sent} membre${sent > 1 ? "s" : ""}${failed > 0 ? ` (${failed} échec${failed > 1 ? "s" : ""})` : ""}`,
  };
}
