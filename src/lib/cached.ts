import { unstable_cache } from "next/cache";
import { db } from "./db";

// Revalidate every 5 minutes — class types and plans rarely change
export const getCachedClassTypes = unstable_cache(
  () => db.classType.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ["class-types"],
  { revalidate: 300, tags: ["class-types"] }
);

export const getCachedPlans = unstable_cache(
  () => db.plan.findMany({ where: { active: true }, orderBy: { priceCents: "asc" } }),
  ["plans"],
  { revalidate: 300, tags: ["plans"] }
);

export const getCachedLocations = unstable_cache(
  () => db.location.findMany({ orderBy: { name: "asc" } }),
  ["locations"],
  { revalidate: 300, tags: ["locations"] }
);

export const getCachedInstructors = unstable_cache(
  () =>
    db.user.findMany({
      where: { role: { in: ["INSTRUCTOR", "ADMIN"] }, active: true },
      orderBy: { firstName: "asc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        instructorBio: true,
        instructorPhoto: true,
      },
    }),
  ["instructors"],
  { revalidate: 300, tags: ["instructors"] }
);

export const getCachedSettings = unstable_cache(
  () => db.settings.findUnique({ where: { id: "singleton" } }),
  ["settings"],
  { revalidate: 300, tags: ["settings"] }
);
