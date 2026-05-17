"use server";

import { getCurrentUser } from "@/lib/auth";
import { sendEmail, emailTemplates } from "@/lib/email";
import { audit } from "@/lib/audit";

type TemplateKey = keyof typeof emailTemplates;

function sampleFor(key: TemplateKey, firstName: string) {
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
      return emailTemplates.noShowFee({ firstName, className: "Yoga Flow", fee: 1, newBalance: 4 });
    case "subscriptionExpiringSoon":
      return emailTemplates.subscriptionExpiringSoon({
        firstName,
        planName: "Mensuel illimité",
        endDate: new Date(Date.now() + 3 * 86400000),
        daysLeft: 3,
      });
    case "subscriptionCancelled":
      return emailTemplates.subscriptionCancelled({ firstName, planName: "Mensuel illimité" });
    case "paymentFailed":
      return emailTemplates.paymentFailed({ firstName, planName: "Mensuel illimité" });
    case "sessionCancelledByStudio":
      return emailTemplates.sessionCancelledByStudio({
        firstName,
        className: "Yoga Flow",
        startTime: new Date(Date.now() + 86400000),
        creditsRefunded: 1,
      });
  }
}

export async function sendTestEmailAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return { ok: false as const, error: "Non autorisé" };
  }
  const key = formData.get("key") as TemplateKey;
  const to = (formData.get("to") as string) || user.email;
  if (!key || !(key in emailTemplates)) {
    return { ok: false as const, error: "Template inconnu" };
  }
  const tpl = sampleFor(key, user.firstName);
  try {
    await sendEmail({ to, subject: `[TEST] ${tpl.subject}`, html: tpl.html });
    await audit({
      actorId: user.id,
      action: "ADMIN_SEND_TEST_EMAIL",
      entity: "Email",
      metadata: { template: key, to },
    });
    return { ok: true as const, message: `Email test envoyé à ${to}` };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Erreur envoi",
    };
  }
}
