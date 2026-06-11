import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { verifyCronAuth } from "@/lib/cronAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sends a weekly recap email to every active user who had at least one
 * confirmed booking in the last 7 days OR has an upcoming booking in the next
 * 7 days. Scheduled Sunday 8 AM: GET /api/cron/weekly-recap
 *
 * If running on a daily schedule, add an early-exit guard:
 *   if (new Date().getDay() !== 0) return NextResponse.json({ ok: true, sent: 0, skipped: "not Sunday" });
 */
export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const now = new Date();
  if (now.getDay() !== 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: "not Sunday" });
  }
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Week label for the subject line (Monday of the current week)
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekLabel = monday.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Find active, non-banned users who are relevant this week
  const users = await db.user.findMany({
    where: {
      active: true,
      banned: false,
      emailOptIn: true,
      bookings: {
        some: {
          OR: [
            // had a confirmed or attended booking in the last 7 days
            {
              status: { in: ["CONFIRMED", "ATTENDED"] },
              session: { startTime: { gte: sevenDaysAgo, lte: now } },
            },
            // has an upcoming confirmed booking in the next 7 days
            {
              status: "CONFIRMED",
              session: { startTime: { gte: now, lte: sevenDaysAhead } },
            },
          ],
        },
      },
    },
    include: {
      bookings: {
        where: {
          status: { in: ["CONFIRMED", "ATTENDED", "NO_SHOW"] },
        },
        include: {
          session: {
            include: { classType: true },
          },
        },
        orderBy: { session: { startTime: "asc" } },
      },
    },
  });

  let sent = 0;

  for (const user of users) {
    try {
      // Courses attended in the last 7 days
      const coursesThisWeek = user.bookings.filter(
        (b) =>
          (b.status === "CONFIRMED" || b.status === "ATTENDED") &&
          b.session.startTime >= sevenDaysAgo &&
          b.session.startTime <= now
      ).length;

      // All-time total: CONFIRMED + ATTENDED + NO_SHOW
      const totalCourses = user.bookings.filter(
        (b) => b.status === "CONFIRMED" || b.status === "ATTENDED" || b.status === "NO_SHOW"
      ).length;

      // Next 3 upcoming confirmed bookings
      const upcomingBookings = user.bookings
        .filter(
          (b) =>
            b.status === "CONFIRMED" && b.session.startTime > now
        )
        .sort(
          (a, b) =>
            a.session.startTime.getTime() - b.session.startTime.getTime()
        )
        .slice(0, 3);

      const html = buildRecapHtml({
        firstName: user.firstName,
        weekLabel,
        coursesThisWeek,
        totalCourses,
        creditsBalance: user.creditsBalance,
        upcomingBookings: upcomingBookings.map((b) => ({
          className: b.session.classType.name,
          startTime: b.session.startTime,
        })),
      });

      await sendEmail({
        to: user.email,
        subject: `Votre récap Ilannatek — semaine du ${weekLabel}`,
        html,
      });

      sent++;
    } catch (err) {
      console.error(`[weekly-recap] Failed for user ${user.id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, sent });
}

// ─── HTML builder ─────────────────────────────────────────────────────────────

function buildRecapHtml(args: {
  firstName: string;
  weekLabel: string;
  coursesThisWeek: number;
  totalCourses: number;
  creditsBalance: number;
  upcomingBookings: { className: string; startTime: Date }[];
}): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ilannatek.fr";

  const upcomingRows =
    args.upcomingBookings.length > 0
      ? args.upcomingBookings
          .map(
            (b) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #EAE3D4;font-size:14px;color:#1C1C1A">
            <strong>${b.className}</strong>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #EAE3D4;font-size:14px;color:#6E6555;text-align:right">
            ${b.startTime.toLocaleDateString("fr-FR", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })} · ${b.startTime.toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </td>
        </tr>`
          )
          .join("")
      : `<tr><td colspan="2" style="padding:12px 0;font-size:14px;color:#6E6555">Aucun cours à venir — <a href="${siteUrl}/schedule" style="color:#A07B3A">voir le planning</a></td></tr>`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:24px;background:#F7F3EC;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1C1C1A">

  <!-- Card -->
  <div style="max-width:580px;margin:auto;background:#fff;border:1px solid #DDD5C5;padding:40px">

    <!-- Logo -->
    <a href="${siteUrl}" style="display:block;font-family:Georgia,serif;font-size:20px;letter-spacing:0.18em;text-transform:uppercase;color:#1C1C1A;text-decoration:none;margin-bottom:32px">
      Ilannatek
    </a>

    <!-- Title -->
    <h1 style="font-family:Georgia,serif;font-size:28px;font-weight:500;color:#1C1C1A;margin:0 0 8px">
      Votre semaine
    </h1>
    <p style="color:#6E6555;font-size:13px;margin:0 0 28px">Semaine du ${args.weekLabel}</p>

    <p style="margin:0 0 24px">Bonjour ${args.firstName},</p>

    <!-- Stats row -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:28px">
      <tr>
        <td width="33%" style="padding:16px;background:#F2EDE2;text-align:center;border-right:4px solid #F7F3EC">
          <div style="font-family:Georgia,serif;font-size:28px;font-weight:600;color:#A07B3A">${args.coursesThisWeek}</div>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#6E6555;margin-top:4px">cours cette semaine</div>
        </td>
        <td width="33%" style="padding:16px;background:#F2EDE2;text-align:center;border-right:4px solid #F7F3EC">
          <div style="font-family:Georgia,serif;font-size:28px;font-weight:600;color:#1C1C1A">${args.totalCourses}</div>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#6E6555;margin-top:4px">cours au total</div>
        </td>
        <td width="33%" style="padding:16px;background:#F2EDE2;text-align:center">
          <div style="font-family:Georgia,serif;font-size:28px;font-weight:600;color:#1C1C1A">${args.creditsBalance}</div>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#6E6555;margin-top:4px">crédits restants</div>
        </td>
      </tr>
    </table>

    <!-- Upcoming bookings -->
    <h2 style="font-family:Georgia,serif;font-size:16px;font-weight:500;color:#1C1C1A;margin:0 0 12px;letter-spacing:0.05em;text-transform:uppercase">
      Prochains cours
    </h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:28px">
      ${upcomingRows}
    </table>

    <!-- CTA -->
    <p style="margin:0 0 24px">
      <a href="${siteUrl}/schedule"
         style="display:inline-block;background:#A07B3A;color:#FAF7F1;padding:14px 28px;text-decoration:none;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;font-weight:600">
        Voir le planning →
      </a>
    </p>

    <hr style="border:none;border-top:1px solid #EAE3D4;margin:24px 0"/>
    <p style="color:#928775;font-size:12px;margin:0">
      Vous recevez ce message car vous avez un compte actif chez Ilannatek.
    </p>

  </div>

  <!-- Footer -->
  <p style="max-width:580px;margin:16px auto 0;color:#928775;font-size:11px;text-align:center;letter-spacing:0.1em;text-transform:uppercase">
    Studio Boutique · <a href="${siteUrl}" style="color:#928775">${siteUrl.replace("https://", "").replace("http://", "")}</a>
  </p>

</body>
</html>`;
}
