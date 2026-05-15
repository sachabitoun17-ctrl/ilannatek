import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminPw = await bcrypt.hash("admin1234", 10);
  const memberPw = await bcrypt.hash("member1234", 10);

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

  const member = await db.user.upsert({
    where: { email: "membre@ilannatek.fr" },
    update: {},
    create: {
      email: "membre@ilannatek.fr",
      passwordHash: memberPw,
      firstName: "Sasha",
      lastName: "Dupont",
      role: "USER",
      creditsBalance: 10,
    },
  });

  const instructorsData = [
    { firstName: "Camille", lastName: "Martin", bio: "Yoga & méditation" },
    { firstName: "Hugo", lastName: "Bernard", bio: "HIIT & cardio" },
    { firstName: "Léa", lastName: "Petit", bio: "Pilates & barre" },
  ];
  const instructors = [];
  for (const i of instructorsData) {
    const u = await db.user.upsert({
      where: { email: `${i.firstName.toLowerCase()}@ilannatek.fr` },
      update: {},
      create: {
        email: `${i.firstName.toLowerCase()}@ilannatek.fr`,
        passwordHash: await bcrypt.hash("instructor1234", 10),
        firstName: i.firstName,
        lastName: i.lastName,
        role: "INSTRUCTOR",
        instructorBio: i.bio,
      },
    });
    instructors.push(u);
  }

  const locations = await Promise.all([
    db.location.upsert({
      where: { id: "loc-paris-11" },
      update: {},
      create: {
        id: "loc-paris-11",
        name: "Paris 11ème",
        address: "12 rue de la Roquette, 75011 Paris",
      },
    }),
    db.location.upsert({
      where: { id: "loc-paris-marais" },
      update: {},
      create: {
        id: "loc-paris-marais",
        name: "Le Marais",
        address: "5 rue des Archives, 75004 Paris",
      },
    }),
  ]);

  const classTypesData = [
    { id: "ct-yoga", name: "Yoga Flow", duration: 60, color: "#10b981", cost: 1 },
    { id: "ct-hiit", name: "HIIT Cardio", duration: 45, color: "#ef4444", cost: 1 },
    { id: "ct-pilates", name: "Pilates Mat", duration: 55, color: "#8b5cf6", cost: 1 },
    { id: "ct-cycle", name: "Indoor Cycling", duration: 45, color: "#f59e0b", cost: 2 },
    { id: "ct-barre", name: "Barre", duration: 50, color: "#ec4899", cost: 1 },
  ];

  const classTypes = [];
  for (const ct of classTypesData) {
    const c = await db.classType.upsert({
      where: { id: ct.id },
      update: {},
      create: {
        id: ct.id,
        name: ct.name,
        durationMin: ct.duration,
        color: ct.color,
        creditCost: ct.cost,
        description: `Cours de ${ct.name.toLowerCase()}.`,
      },
    });
    classTypes.push(c);
  }

  const plans = [
    {
      name: "Découverte",
      type: "CREDIT_PACK",
      priceCents: 2000,
      creditsAmount: 1,
      description: "Idéal pour un premier cours",
    },
    {
      name: "Pack 5 cours",
      type: "CREDIT_PACK",
      priceCents: 9500,
      creditsAmount: 5,
      description: "Économisez 5%",
    },
    {
      name: "Pack 10 cours",
      type: "CREDIT_PACK",
      priceCents: 18000,
      creditsAmount: 10,
      description: "Économisez 10%",
    },
    {
      name: "Pack 20 cours",
      type: "CREDIT_PACK",
      priceCents: 32000,
      creditsAmount: 20,
      description: "Économisez 20%",
    },
    {
      name: "Mensuel illimité",
      type: "SUBSCRIPTION",
      priceCents: 14900,
      intervalDays: 30,
      creditsPerCycle: 100,
      description: "Jusqu'à 100 crédits / mois",
    },
    {
      name: "Annuel illimité",
      type: "SUBSCRIPTION",
      priceCents: 149000,
      intervalDays: 365,
      creditsPerCycle: 1200,
      description: "12 mois pour le prix de 10",
    },
  ];

  for (const p of plans) {
    const existing = await db.plan.findFirst({ where: { name: p.name } });
    if (!existing) await db.plan.create({ data: p });
  }

  await db.session.deleteMany({});

  const now = new Date();
  const today = new Date(now);
  today.setHours(7, 0, 0, 0);

  let sessionCount = 0;
  for (let day = 0; day < 14; day++) {
    const baseDate = new Date(today);
    baseDate.setDate(baseDate.getDate() + day);

    const dailySlots = [
      { h: 7, m: 0 },
      { h: 9, m: 30 },
      { h: 12, m: 15 },
      { h: 17, m: 30 },
      { h: 19, m: 0 },
      { h: 20, m: 30 },
    ];

    for (let i = 0; i < dailySlots.length; i++) {
      const slot = dailySlots[i];
      const start = new Date(baseDate);
      start.setHours(slot.h, slot.m, 0, 0);
      const ct = classTypes[(day + i) % classTypes.length];
      const instructor = instructors[(day + i) % instructors.length];
      const location = locations[(day + i) % locations.length];
      const end = new Date(start.getTime() + ct.durationMin * 60000);

      await db.session.create({
        data: {
          classTypeId: ct.id,
          instructorId: instructor.id,
          locationId: location.id,
          startTime: start,
          endTime: end,
          capacity: 12 + (i % 3) * 2,
        },
      });
      sessionCount++;
    }
  }

  console.log(`✓ Admin: admin@ilannatek.fr / admin1234`);
  console.log(`✓ Member: membre@ilannatek.fr / member1234`);
  console.log(`✓ ${instructors.length} instructeurs, ${classTypes.length} types de cours`);
  console.log(`✓ ${sessionCount} séances créées sur 14 jours`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
