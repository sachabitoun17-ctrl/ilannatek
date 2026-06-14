import { db } from "./db";

export type Settings = {
  studioName: string;
  cancellationCutoffMin: number;
  lateCancelFee: number;
  noShowFee: number;
  bookingWindowDays: number;
  welcomeCredits: number;
  emailFrom: string;
  stripePublishableKey: string | null;
};

const CACHE_TTL_MS = 30_000;
const settingsCache: Record<string, { data: Settings; loadedAt: number }> = {};

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

function rowToSettings(row: {
  studioName: string;
  cancellationCutoffMin: number;
  lateCancelFee: number;
  noShowFee: number;
  bookingWindowDays: number;
  welcomeCredits: number;
  emailFrom: string;
  stripePublishableKey: string | null;
}): Settings {
  return {
    studioName: row.studioName,
    cancellationCutoffMin: row.cancellationCutoffMin,
    lateCancelFee: row.lateCancelFee,
    noShowFee: row.noShowFee,
    bookingWindowDays: row.bookingWindowDays,
    welcomeCredits: row.welcomeCredits,
    emailFrom: row.emailFrom,
    stripePublishableKey: row.stripePublishableKey,
  };
}

/**
 * Fetch settings for a given studio (by studioId), falling back to the
 * platform singleton when no studio-specific settings exist yet.
 * Pass null or undefined to always get the singleton (legacy usage).
 */
export async function getSettings(studioId?: string | null): Promise<Settings> {
  const cacheKey = studioId ?? "singleton";
  const cached = settingsCache[cacheKey];
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  let row = null;
  if (studioId) {
    row = await db.settings.findUnique({ where: { studioId } });
  }
  if (!row) {
    row = await db.settings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });
  }

  const data = rowToSettings(row);
  settingsCache[cacheKey] = { data, loadedAt: Date.now() };
  return data;
}

export async function updateSettings(patch: Partial<Settings>, studioId?: string | null) {
  if (studioId) {
    await db.settings.upsert({
      where: { studioId },
      update: patch,
      create: { studioId, ...DEFAULTS, ...patch },
    });
  } else {
    await db.settings.upsert({
      where: { id: "singleton" },
      update: patch,
      create: { id: "singleton", ...DEFAULTS, ...patch },
    });
  }
  // Invalidate both keys
  delete settingsCache[studioId ?? "singleton"];
  delete settingsCache["singleton"];
}

export function invalidateSettings(studioId?: string | null) {
  delete settingsCache[studioId ?? "singleton"];
  delete settingsCache["singleton"];
}
