import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function setTime(d: Date, h: number, m: number) {
  const r = new Date(d);
  r.setHours(h, m, 0, 0);
  return r;
}

async function main() {
  console.log("Seeding database...");

  const adminPw = await bcrypt.hash("admin1234", 10);
  const memberPw = await bcrypt.hash("member1234", 10);
  const instrPw = await bcrypt.hash("instructor1234", 10);

  // ─── Admin ────────────────────────────────────────────────────────────────────
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
    {
      firstName: "Camille", lastName: "Martin",
      bio: "Professeure de Yoga & méditation depuis 8 ans. Certifiée RYT-500. Spécialiste vinyasa et yin yoga.",
      specialties: ["Yoga Flow", "Méditation"],
    },
    {
      firstName: "Hugo", lastName: "Bernard",
      bio: "Coach HIIT & cardio. Ancien athlète de haut niveau, passionné par la performance et le dépassement de soi.",
      specialties: ["HIIT Cardio", "Indoor Cycling"],
    },
    {
      firstName: "Léa", lastName: "Petit",
      bio: "Spécialiste Pilates & Barre. Formée à la méthode Stott Pilates, 6 ans d'expérience en studio boutique.",
      specialties: ["Pilates Mat", "Barre"],
    },
    {
      firstName: "Antoine", lastName: "Rousseau",
      bio: "Professeur de méditation et yoga restaurateur. Formé en Inde, pratique depuis 12 ans.",
      specialties: ["Méditation", "Yoga Flow"],
    },
    {
      firstName: "Sofia", lastName: "Garcia",
      bio: "Instructrice Indoor Cycling et HIIT. Certifiée Spinning®, ex-coureuse cycliste.",
      specialties: ["Indoor Cycling", "HIIT Cardio"],
    },
  ];

  const instructors: { id: string; firstName: string }[] = [];
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

  // ─── Membres test ─────────────────────────────────────────────────────────────
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
    { first: "Romain", last: "Blanc", credits: 12 },
    { first: "Clara", last: "Morel", credits: 4 },
    { first: "Antoine", last: "Durand", credits: 7 },
    { first: "Léa", last: "Michel", credits: 2 },
    { first: "Paul", last: "Garcia", credits: 9 },
  ];

  const membres: { id: string; firstName: string; lastName: string }[] = [];
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

  // ─── Locations ────────────────────────────────────────────────────────────────
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
    { id: "ct-meditation", name: "Méditation", duration: 45, color: "#6366f1", cost: 1, desc: "Pleine conscience guidée pour réduire le stress et recharger les batteries." },
  ];

  const classTypes: { id: string; durationMin: number; creditCost: number }[] = [];
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

  const plans: { id: string; name: string }[] = [];
  for (const p of plansData) {
    const existing = await db.plan.findFirst({ where: { name: p.name } });
    if (existing) { plans.push(existing); continue; }
    const plan = await db.plan.create({ data: p });
    plans.push(plan);
  }

  // ─── Transactions historiques ─────────────────────────────────────────────────
  const pack5 = plans.find((p) => p.name === "Pack 5 cours")!;
  const pack10 = plans.find((p) => p.name === "Pack 10 cours")!;
  const mensuel = plans.find((p) => p.name === "Mensuel illimité")!;

  const txExisting = await db.transaction.count({ where: { userId: membres[0].id } });
  if (txExisting === 0) {
    const txData = [
      { user: membres[0], plan: pack5, cents: 9500, credits: 5, daysAgo: 60 },
      { user: membres[0], plan: pack10, cents: 18000, credits: 10, daysAgo: 30 },
      { user: membres[0], plan: pack5, cents: 9500, credits: 5, daysAgo: 5 },
      { user: membres[1], plan: pack10, cents: 18000, credits: 10, daysAgo: 45 },
      { user: membres[3], plan: mensuel, cents: 14900, credits: 100, daysAgo: 60 },
      { user: membres[3], plan: mensuel, cents: 14900, credits: 100, daysAgo: 30 },
      { user: membres[5], plan: pack5, cents: 9500, credits: 5, daysAgo: 15 },
      { user: membres[7], plan: pack10, cents: 18000, credits: 10, daysAgo: 7 },
      { user: membres[10], plan: pack10, cents: 18000, credits: 10, daysAgo: 20 },
      { user: membres[11], plan: pack5, cents: 9500, credits: 5, daysAgo: 10 },
      { user: membres[13], plan: mensuel, cents: 14900, credits: 100, daysAgo: 3 },
    ];
    for (const tx of txData) {
      await db.transaction.create({
        data: {
          userId: tx.user.id,
          planId: tx.plan.id,
          type: "CREDIT_PACK_PURCHASE",
          amountCents: tx.cents,
          creditsDelta: tx.credits,
          description: tx.plan.name,
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

  // ─── Séances (~500 sessions sur 75 jours) ────────────────────────────────────
  const existingSessions = await db.session.count();
  if (existingSessions > 0 && process.env.SEED_RESET_SESSIONS !== "1") {
    console.log(`✓ ${existingSessions} sessions déjà en base — skip`);
  } else {
    if (existingSessions > 0) await db.session.deleteMany({});

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // 8 créneaux horaires par jour
    const dailySlots = [
      { h: 7, m: 0 },
      { h: 8, m: 0 },
      { h: 9, m: 30 },
      { h: 11, m: 0 },
      { h: 12, m: 15 },
      { h: 17, m: 30 },
      { h: 19, m: 0 },
      { h: 20, m: 30 },
    ];

    // Dimanche = moins de créneaux (seulement matin)
    const sundaySlots = [
      { h: 9, m: 0 },
      { h: 10, m: 30 },
      { h: 11, m: 30 },
    ];

    // Mapping instructeurs préférés par type de cours
    const instructorByType: Record<string, number[]> = {
      "ct-yoga": [0, 3],       // Camille, Antoine
      "ct-hiit": [1, 4],       // Hugo, Sofia
      "ct-pilates": [2],       // Léa
      "ct-cycle": [4, 1],      // Sofia, Hugo
      "ct-barre": [2, 0],      // Léa, Camille
      "ct-meditation": [3, 0], // Antoine, Camille
    };

    const createdSessions: { id: string; startTime: Date; status: string }[] = [];

    // -14 jours → +60 jours = 75 jours de planning
    for (let day = -14; day <= 60; day++) {
      const baseDate = addDays(today, day);
      const dayOfWeek = baseDate.getDay(); // 0=dimanche
      const slots = dayOfWeek === 0 ? sundaySlots : dailySlots;

      // Sauter quelques jours aléatoirement pour réalisme (fériés etc.)
      const seed = Math.abs(day * 7 + 13);
      if (day > 0 && seed % 21 === 0) continue; // ~1 jour/3 semaines fermé

      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        const start = setTime(baseDate, slot.h, slot.m);
        const isPast = start < now;

        // Choisir le type de cours selon horaire + jour
        const ctIndex = (Math.abs(day) + i + dayOfWeek) % classTypes.length;
        const ct = classTypes[ctIndex];

        // Choisir l'instructeur selon le type de cours
        const instrIndices = instructorByType[ct.id] ?? [0];
        const instrIdx = instrIndices[(Math.abs(day) + i) % instrIndices.length];
        const instructor = instructors[instrIdx];

        // Alterner les studios
        const location = locations[(Math.abs(day) + i) % locations.length];

        const end = new Date(start.getTime() + ct.durationMin * 60000);

        // Capacité variée: 8-16 places
        const cap = 8 + ((Math.abs(day) + i) % 3) * 4; // 8, 12 ou 16

        // Quelques séances annulées dans le passé (1/20)
        const isCancelled = isPast && (seed % 20 === 0);

        const s = await db.session.create({
          data: {
            classTypeId: ct.id,
            instructorId: instructor.id,
            locationId: location.id,
            startTime: start,
            endTime: end,
            capacity: cap,
            status: isCancelled ? "CANCELLED" : "SCHEDULED",
          },
        });
        createdSessions.push(s);
      }
    }

    // ─── Réservations passées (historique dense) ──────────────────────────────
    const pastSessions = createdSessions.filter(
      (s) => s.startTime < now && s.status === "SCHEDULED"
    );

    for (let i = 0; i < pastSessions.length; i++) {
      const session = pastSessions[i];
      const seed = i * 7 + 3;
      // 2-8 membres par séance passée
      const count = 2 + (seed % 7);
      const membersToBook = membres.slice(0, Math.min(count, membres.length));

      for (const m of membersToBook) {
        const already = await db.booking.findUnique({
          where: { sessionId_userId: { sessionId: session.id, userId: m.id } },
        });
        if (already) continue;

        const isNoShow = seed % 12 === 0;
        await db.booking.create({
          data: {
            sessionId: session.id,
            userId: m.id,
            status: isNoShow ? "NO_SHOW" : "CONFIRMED",
            creditsUsed: 1,
          },
        });
        if (!isNoShow) {
          await db.checkIn.upsert({
            where: { sessionId_userId: { sessionId: session.id, userId: m.id } },
            update: {},
            create: { sessionId: session.id, userId: m.id, source: "MANUAL" },
          });
        }
      }
    }

    // ─── Réservations à venir ─────────────────────────────────────────────────
    const upcomingSessions = createdSessions
      .filter((s) => s.startTime > now)
      .slice(0, 60);

    for (let i = 0; i < upcomingSessions.length; i++) {
      const session = upcomingSessions[i];
      const seed = i * 5 + 2;
      const count = 1 + (seed % 5);
      const membersToBook = membres.slice(0, Math.min(count, membres.length));

      for (const m of membersToBook) {
        const already = await db.booking.findUnique({
          where: { sessionId_userId: { sessionId: session.id, userId: m.id } },
        });
        if (!already) {
          await db.booking.create({
            data: { sessionId: session.id, userId: m.id, status: "CONFIRMED", creditsUsed: 1 },
          });
        }
      }

      // Quelques séances avec liste d'attente (complet + 2 waitlistés)
      if (seed % 8 === 0) {
        const waitlisters = membres.slice(5, 7);
        for (let w = 0; w < waitlisters.length; w++) {
          const already = await db.booking.findUnique({
            where: { sessionId_userId: { sessionId: session.id, userId: waitlisters[w].id } },
          });
          if (!already) {
            await db.booking.create({
              data: {
                sessionId: session.id,
                userId: waitlisters[w].id,
                status: "WAITLISTED",
                creditsUsed: 0,
                waitlistPos: w + 1,
              },
            });
          }
        }
      }
    }

    console.log(`✓ ${createdSessions.length} séances créées (-14j → +60j)`);
    console.log(`✓ ${pastSessions.length} séances passées avec réservations`);
  }

  console.log(`\n✓ Admin        : admin@ilannatek.fr / admin1234`);
  console.log(`✓ Membre       : sasha.dupont@test.fr / member1234`);
  console.log(`✓ Instructeur  : camille@ilannatek.fr / instructor1234`);
  console.log(`✓ ${membres.length} membres, ${instructors.length} instructeurs, ${classTypes.length} types de cours`);
  console.log(`✓ ${plans.length} plans tarifaires`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
