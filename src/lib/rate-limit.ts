// In-memory sliding-window rate limiter.
// TODO: remplacer par Upstash Redis pour multi-instance

const MAX_STORE_SIZE = 10_000;

type Bucket = { hits: number[]; lastUsed: number };
const store = new Map<string, Bucket>();

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function evictLRU() {
  if (store.size < MAX_STORE_SIZE) return;
  let oldestKey = "";
  let oldestTime = Infinity;
  for (const [key, bucket] of store.entries()) {
    if (bucket.lastUsed < oldestTime) {
      oldestTime = bucket.lastUsed;
      oldestKey = key;
    }
  }
  if (oldestKey) store.delete(oldestKey);
}

function maybeCleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of store.entries()) {
    if (bucket.hits.length === 0 || now - bucket.lastUsed > 60 * 60 * 1000) {
      store.delete(key);
    }
  }
}

export function rateLimit(
  key: string,
  max: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  maybeCleanup(now);

  const existing = store.get(key);
  const bucket: Bucket = existing ?? { hits: [], lastUsed: now };
  bucket.lastUsed = now;

  while (bucket.hits.length > 0 && bucket.hits[0] < now - windowMs) {
    bucket.hits.shift();
  }
  if (bucket.hits.length >= max) {
    store.set(key, bucket);
    const retryAfterMs = bucket.hits[0] + windowMs - now;
    return { allowed: false, remaining: 0, retryAfterMs };
  }
  if (!existing) evictLRU();
  bucket.hits.push(now);
  store.set(key, bucket);
  return { allowed: true, remaining: max - bucket.hits.length, retryAfterMs: 0 };
}

export const LIMITS = {
  LOGIN_PER_EMAIL: { max: 5, windowMs: 15 * 60 * 1000 },
  LOGIN_PER_IP: { max: 20, windowMs: 15 * 60 * 1000 },
  REGISTER_PER_IP: { max: 5, windowMs: 60 * 60 * 1000 },
  BOOKING_PER_USER: { max: 30, windowMs: 60 * 1000 },
  CHECKOUT_PER_USER: { max: 10, windowMs: 60 * 1000 },
};
