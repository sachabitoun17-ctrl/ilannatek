import { db } from "./db";

type Settings = {
  studioName: string;
  cancellationCutoffMin: number;
  lateCancelFee: number;
  noShowFee: number;
  bookingWindowDays: number;
  welcomeCredits: number;
  emailFrom: string;
  stripePublishableKey: string | null;
};

let cache: { data: Settings; loadedAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

const DEFAULTS: Settings = {
  studioName: "Ilannatek",
  cancellationCutoffMin: 120,
  lateCancelFee: 1,
  noShowFee: 2,
  bookingWindowDays: 14,
  welcomeCredits: 0,
  emailFrom: "noreply@ilannatek.fr",
  stripePublishableKey: null,
};

export async function getSettings(): Promise<Settings> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) {
    return cache.data;
  }
  const row = await db.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  const data: Settings = {
    studioName: row.studioName,
    cancellationCutoffMin: row.cancellationCutoffMin,
    lateCancelFee: row.lateCancelFee,
    noShowFee: row.noShowFee,
    bookingWindowDays: row.bookingWindowDays,
    welcomeCredits: row.welcomeCredits,
    emailFrom: row.emailFrom,
    stripePublishableKey: row.stripePublishableKey,
  };
  cache = { data, loadedAt: Date.now() };
  return data;
}

export async function updateSettings(patch: Partial<Settings>) {
  await db.settings.upsert({
    where: { id: "singleton" },
    update: patch,
    create: { id: "singleton", ...DEFAULTS, ...patch },
  });
  cache = null;
}

export function invalidateSettings() {
  cache = null;
}
