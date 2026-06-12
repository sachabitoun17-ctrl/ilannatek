"use server";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getSettings } from "@/lib/settings";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildBroadcastHtml(subject: string, body: string, from: string, siteUrl: string): string {
  const paragraphs = body
    .split("\n\n")
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1C1C1A">${escHtml(p).replace(/\n/g, "<br/>")}</p>`)
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
      <h1 class="title">${escHtml(subject)}</h1>
      ${paragraphs}
      <hr class="divider"/>
      <p style="font-size:12px;color:#6E6555">Vous recevez cet email en tant que membre du studio Ilannatek.</p>
    </div>
    <p class="footer">Studio Boutique · <a href="${siteUrl}" style="color:#928775">${siteUrl.replace(/https?:\/\//, "")}</a></p>
  </body></html>`;
}

export async function generateEmailBodyAction(
  audience: string,
  subject: string
): Promise<{ ok: true; body: string } | { ok: false; error: string }> {
  await requireAdmin();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: "ANTHROPIC_API_KEY non configuré" };
  if (!subject.trim()) return { ok: false, error: "Sujet requis pour générer le contenu" };

  const audienceLabels: Record<string, string> = {
    all: "tous les membres actifs du studio",
    active_sub: "les membres ayant un abonnement actif",
    no_sub: "les membres sans abonnement actif (à reconvertir)",
    zero_credits: "les membres avec un solde de crédits nul (à relancer)",
  };
  const audienceDesc = audienceLabels[audience] ?? "les membres du studio";

  const prompt = `Tu es un rédacteur expert en emails marketing pour un studio de fitness boutique haut de gamme parisien.
Rédige le corps d'un email en français, élégant et chaleureux, destiné à ${audienceDesc}.
Sujet de l'email : « ${subject} »

Consignes :
- Ton : professionnel mais humain, proche, bienveillant
- Longueur : 3 à 5 paragraphes courts
- Pas de formule de politesse d'ouverture générique (pas de "Cher membre")
- Commence directement par une accroche percutante liée au sujet
- Termine par un appel à l'action clair
- N'inclus pas le sujet dans le corps
- Retourne uniquement le corps du message (pas de "Objet :", pas de signature, pas d'indication d'envoi)
- Sépare les paragraphes par une ligne vide`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-8",
        max_tokens: 1024,
        thinking: { type: "adaptive" },
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: (err as { error?: { message?: string } }).error?.message ?? "Erreur API" };
    }

    const data = await res.json() as {
      content: Array<{ type: string; text?: string }>;
    };
    const body = data.content.find((b) => b.type === "text")?.text ?? "";
    if (!body) return { ok: false, error: "Réponse vide de l'IA" };

    return { ok: true, body };
  } catch {
    return { ok: false, error: "Impossible de contacter l'API Claude" };
  }
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
    where: { ...whereClause, role: { in: ["USER", "INSTRUCTOR"] }, emailOptIn: true },
    select: { id: true, email: true, firstName: true },
  });

  if (members.length === 0) {
    return { ok: false as const, error: "Aucun destinataire correspondant" };
  }

  const html = buildBroadcastHtml(subject, body, settings.emailFrom, siteUrl);

  // Insert into EmailOutbox — the retry cron drains them in the background.
  // This avoids the Vercel function timeout on large lists and ensures no
  // partial sends (the action returns instantly; delivery is async).
  await db.emailOutbox.createMany({
    data: members.map((m) => ({
      to: m.email,
      subject,
      html,
    })),
  });

  void audit({
    actorId: admin.id,
    action: "ADMIN_BROADCAST_EMAIL",
    entity: "Email",
    metadata: { subject, audience, queued: members.length },
  });

  return {
    ok: true as const,
    message: `${members.length} email${members.length > 1 ? "s" : ""} mis en file d'envoi`,
  };
}
