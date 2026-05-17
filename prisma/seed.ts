import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

async function main() {
  console.log("Seeding database...");

  const adminPw = await bcrypt.hash("admin1234", 10);
  const memberPw = await bcrypt.hash("member1234", 10);
  const instrPw = await bcrypt.hash("instructor1234", 10);

  // ─── Admin ───────────────────────────────────────────────────────────────────
  const admin = await db.user.upsert({
    where: { email: "admin@ilannatek.fr" },
    update: {},
    create: {
      email: "admin@ilannatek.fr",
      passwordHash: adminPw,
      firstName: "Admin",
      lastName: "Ilannatek",
      role: "ADMIN",
      creditsBalance: 100,
    },
  });

  // ─── Instructeurs ─────────────────────────────────────────────────────────────
  const instructorsData = [
    { firstName: "Camille", lastName: "Martin", bio: "Professeure de Yoga & méditation depuis 8 ans. Certifiée RYT-500." },
    { firstName: "Hugo", lastName: "Bernard", bio: "Coach HIIT & cardio. Ancien athlète, passionné par le sport collectif." },
    { firstName: "Léa", lastName: "Petit", bio: "Spécialiste Pilates & Barre. Formée à la méthode Stott Pilates." },
  ];
  const instructors: Awaited<ReturnType<typeof db.user.upsert>>[] = [];
  for (const i of instructorsData) {
    const u = await db.user.upsert({
      where: { email: `${i.firstName.toLowerCase()}@ilannatek.fr` },
      update: {},
      create: {
        email: `${i.firstName.toLowerCase()}@ilannatek.fr`,
        passwordHash: instrPw,
        firstName: i.firstName,
        lastName: i.lastName,
        role: "INSTRUCTOR",
        instructorBio: i.bio,
      },
    });
    instructors.push(u);
  }

  // ─── Membres test ────────────────────────────────────────────────────────────
  const membresData = [
    { first: "Sasha", last: "Dupont", credits: 10 },
    { first: "Marie", last: "Lefebvre", credits: 5 },
    { first: "Thomas", last: "Moreau", credits: 0 },
    { first: "Julie", last: "Simon", credits: 20 },
    { first: "Lucas", last: "Laurent", credits: 3 },
    { first: "Emma", last: "Dubois", credits: 8 },
    { first: "Noah", last: "Fontaine", credits: 1 },
    { first: "Chloé", last: "Girard", credits: 15 },
    { first: "Maxime", last: "Bonnet", credits: 0 },
    { first: "Inès", last: "Chevalier", credits: 6 },
  ];

  const membres: Awaited<ReturnType<typeof db.user.upsert>>[] = [];
  for (const m of membresData) {
    const u = await db.user.upsert({
      where: { email: `${m.first.toLowerCase()}.${m.last.toLowerCase()}@test.fr` },
      update: {},
      create: {
        email: `${m.first.toLowerCase()}.${m.last.toLowerCase()}@test.fr`,
        passwordHash: memberPw,
        firstName: m.first,
        lastName: m.last,
        role: "USER",
        creditsBalance: m.credits,
      },
    });
    membres.push(u);
  }

  // ─── Locations ───────────────────────────────────────────────────────────────
  const locations = await Promise.all([
    db.location.upsert({
      where: { id: "loc-paris-11" },
      update: {},
      create: { id: "loc-paris-11", name: "Paris 11ème", address: "12 rue de la Roquette, 75011 Paris" },
    }),
    db.location.upsert({
      where: { id: "loc-paris-marais" },
      update: {},
      create: { id: "loc-paris-marais", name: "Le Marais", address: "5 rue des Archives, 75004 Paris" },
    }),
  ]);

  // ─── Types de cours ───────────────────────────────────────────────────────────
  const classTypesData = [
    { id: "ct-yoga", name: "Yoga Flow", duration: 60, color: "#10b981", cost: 1, desc: "Un cours de yoga vinyasa doux pour se recentrer et travailler la souplesse." },
    { id: "ct-hiit", name: "HIIT Cardio", duration: 45, color: "#ef4444", cost: 1, desc: "Entraînement fractionné haute intensité pour brûler des calories et tonifier." },
    { id: "ct-pilates", name: "Pilates Mat", duration: 55, color: "#8b5cf6", cost: 1, desc: "Renforcement musculaire profond en douceur, idéal pour le dos et le gainage." },
    { id: "ct-cycle", name: "Indoor Cycling", duration: 45, color: "#f59e0b", cost: 2, desc: "Vélo indoor sur musique, cardio et endurance au programme." },
    { id: "ct-barre", name: "Barre", duration: 50, color: "#ec4899", cost: 1, desc: "Inspiré de la danse classique, sculpte et allonge la silhouette." },
  ];

  const classTypes: Awaited<ReturnType<typeof db.classType.upsert>>[] = [];
  for (const ct of classTypesData) {
    const c = await db.classType.upsert({
      where: { id: ct.id },
      update: {},
      create: { id: ct.id, name: ct.name, durationMin: ct.duration, color: ct.color, creditCost: ct.cost, description: ct.desc },
    });
    classTypes.push(c);
  }

  // ─── Plans & packs ────────────────────────────────────────────────────────────
  const plansData = [
    { name: "Découverte", type: "CREDIT_PACK", priceCents: 2000, creditsAmount: 1, description: "Idéal pour un premier cours", introOnly: true },
    { name: "Pack 5 cours", type: "CREDIT_PACK", priceCents: 9500, creditsAmount: 5, description: "Économisez 5%" },
    { name: "Pack 10 cours", type: "CREDIT_PACK", priceCents: 18000, creditsAmount: 10, description: "Économisez 10%" },
    { name: "Pack 20 cours", type: "CREDIT_PACK", priceCents: 32000, creditsAmount: 20, description: "Économisez 20%" },
    { name: "Mensuel illimité", type: "SUBSCRIPTION", priceCents: 14900, intervalDays: 30, creditsPerCycle: 100, description: "Jusqu'à 100 crédits / mois" },
    { name: "Annuel illimité", type: "SUBSCRIPTION", priceCents: 149000, intervalDays: 365, creditsPerCycle: 1200, description: "12 mois pour le prix de 10" },
  ];

  const plans: Awaited<ReturnType<typeof db.plan.create>>[] = [];
  for (const p of plansData) {
    const existing = await db.plan.findFirst({ where: { name: p.name } });
    if (existing) { plans.push(existing); continue; }
    const plan = await db.plan.create({ data: p });
    plans.push(plan);
  }

  // ─── Transactions historiques ─────────────────────────────────────────────────
  const pack5 = plans.find((p) => p.name === "Pack 5 cours")!;
  const pack10 = plans.find((p) => p.name === "Pack 10 cours")!;

  const txExisting = await db.transaction.count({ where: { userId: membres[0].id } });
  if (txExisting === 0) {
    const txData = [
      { user: membres[0], plan: pack5, cents: 9500, credits: 5, daysAgo: 45, desc: "Pack 5 cours" },
      { user: membres[0], plan: pack5, cents: 9500, credits: 5, daysAgo: 20, desc: "Pack 5 cours" },
      { user: membres[1], plan: pack10, cents: 18000, credits: 10, daysAgo: 30, desc: "Pack 10 cours" },
      { user: membres[3], plan: pack10, cents: 18000, credits: 10, daysAgo: 60, desc: "Pack 10 cours" },
      { user: membres[3], plan: pack10, cents: 18000, credits: 10, daysAgo: 15, desc: "Pack 10 cours" },
      { user: membres[5], plan: pack5, cents: 9500, credits: 5, daysAgo: 10, desc: "Pack 5 cours" },
      { user: membres[7], plan: pack10, cents: 18000, credits: 10, daysAgo: 5, desc: "Pack 10 cours" },
    ];
    for (const tx of txData) {
      await db.transaction.create({
        data: {
          userId: tx.user.id,
          planId: tx.plan.id,
          type: "CREDIT_PACK_PURCHASE",
          amountCents: tx.cents,
          creditsDelta: tx.credits,
          description: tx.desc,
          paymentStatus: "PAID",
          createdAt: addDays(new Date(), -tx.daysAgo),
        },
      });
    }
  }

  // ─── Settings ─────────────────────────────────────────────────────────────────
  await db.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      studioName: "Ilannatek",
      cancellationCutoffMin: 120,
      lateCancelFee: 1,
      noShowFee: 2,
      bookingWindowDays: 14,
      welcomeCredits: 1,
      emailFrom: "noreply@ilannatek.fr",
    },
  });

  // ─── Code promo ───────────────────────────────────────────────────────────────
  const existingPromo = await db.promoCode.findUnique({ where: { code: "BIENVENUE10" } });
  if (!existingPromo) {
    await db.promoCode.create({
      data: { code: "BIENVENUE10", description: "10% sur le premier achat", discountType: "PERCENT", discountValue: 10, active: true },
    });
  }

  // ─── Séances ──────────────────────────────────────────────────────────────────
  const existingSessions = await db.session.count();
  if (existingSessions > 0 && process.env.SEED_RESET_SESSIONS !== "1") {
    console.log(`✓ ${existingSessions} sessions déjà en base — skip`);
  } else {
    if (existingSessions > 0) await db.session.deleteMany({});

    const now = new Date();
    const today = new Date(now);
    today.setHours(7, 0, 0, 0);

    const dailySlots = [
      { h: 7, m: 0 }, { h: 9, m: 30 }, { h: 12, m: 15 },
      { h: 17, m: 30 }, { h: 19, m: 0 }, { h: 20, m: 30 },
    ];

    // Sessions passées (7 jours) pour avoir de l'historique
    const createdSessions: Awaited<ReturnType<typeof db.session.create>>[] = [];
    for (let day = -7; day < 14; day++) {
      const baseDate = addDays(today, day);
      for (let i = 0; i < dailySlots.length; i++) {
        const slot = dailySlots[i];
        const start = new Date(baseDate);
        start.setHours(slot.h, slot.m, 0, 0);
        const ct = classTypes[(Math.abs(day) + i) % classTypes.length];
        const instructor = instructors[(Math.abs(day) + i) % instructors.length];
        const location = locations[(Math.abs(day) + i) % locations.length];
        const end = new Date(start.getTime() + ct.durationMin * 60000);
        const isPast = day < 0;

        const s = await db.session.create({
          data: {
            classTypeId: ct.id,
            instructorId: instructor.id,
            locationId: location.id,
            startTime: start,
            endTime: end,
            capacity: 12 + (i % 3) * 2,
            status: isPast && i === 0 ? "CANCELLED" : "SCHEDULED",
          },
        });
        createdSessions.push(s);
      }
    }

    // Réservations sur les sessions passées (historique réaliste)
    const pastSessions = createdSessions.filter((s) => s.startTime < now && s.status === "SCHEDULED");
    for (let i = 0; i < Math.min(pastSessions.length, 25); i++) {
      const session = pastSessions[i];
      const membersToBook = membres.slice(0, 3 + (i % 5));
      for (const m of membersToBook) {
        const alreadyBooked = await db.booking.findUnique({
          where: { sessionId_userId: { sessionId: session.id, userId: m.id } },
        });
        if (alreadyBooked) continue;
        await db.booking.create({
          data: {
            sessionId: session.id,
            userId: m.id,
            status: i % 8 === 0 ? "NO_SHOW" : "CONFIRMED",
            creditsUsed: 1,
          },
        });
        if (i % 8 !== 0) {
          await db.checkIn.upsert({
            where: { sessionId_userId: { sessionId: session.id, userId: m.id } },
            update: {},
            create: { sessionId: session.id, userId: m.id, source: "MANUAL" },
          });
        }
      }
    }

    // Quelques réservations sur les prochains cours
    const upcomingSessions = createdSessions.filter((s) => s.startTime > now).slice(0, 10);
    for (let i = 0; i < upcomingSessions.length; i++) {
      const session = upcomingSessions[i];
      const membersToBook = membres.slice(0, 2 + (i % 4));
      for (const m of membersToBook) {
        const alreadyBooked = await db.booking.findUnique({
          where: { sessionId_userId: { sessionId: session.id, userId: m.id } },
        });
        if (!alreadyBooked) {
          await db.booking.create({
            data: { sessionId: session.id, userId: m.id, status: "CONFIRMED", creditsUsed: 1 },
          });
        }
      }
    }

    console.log(`✓ ${createdSessions.length} séances créées (7 passés + 14 à venir)`);
  }

  console.log(`\n✓ Admin     : admin@ilannatek.fr / admin1234`);
  console.log(`✓ Membre    : sasha.dupont@test.fr / member1234`);
  console.log(`✓ Instructeur: camille@ilannatek.fr / instructor1234`);
  console.log(`✓ ${membres.length} membres test, ${instructors.length} instructeurs`);
  console.log(`✓ ${classTypes.length} types de cours, ${plans.length} plans`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
