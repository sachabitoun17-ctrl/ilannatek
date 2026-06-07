// In-memory sliding-window rate limiter.
// For multi-instance deployments, swap with Redis (Upstash) — same API.

type Bucket = { hits: number[]; };
const store = new Map<string, Bucket>();

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function maybeCleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of store.entries()) {
    // drop buckets that haven't been touched for an hour
    if (bucket.hits.length === 0 || now - bucket.hits[bucket.hits.length - 1] > 60 * 60 * 1000) {
      store.delete(key);
    }
  }
}

/**
 * Returns { allowed, remaining, retryAfterMs }.
 * Sliding window: at most `max` hits per `windowMs` for the given key.
 */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  maybeCleanup(now);

  const bucket = store.get(key) ?? { hits: [] };
  // drop hits outside the window
  while (bucket.hits.length > 0 && bucket.hits[0] < now - windowMs) {
    bucket.hits.shift();
  }
  if (bucket.hits.length >= max) {
    store.set(key, bucket);
    const retryAfterMs = bucket.hits[0] + windowMs - now;
    return { allowed: false, remaining: 0, retryAfterMs };
  }
  bucket.hits.push(now);
  store.set(key, bucket);
  return { allowed: true, remaining: max - bucket.hits.length, retryAfterMs: 0 };
}

export const LIMITS = {
  LOGIN_PER_EMAIL: { max: 5, windowMs: 15 * 60 * 1000 },          // 5 attempts per 15min
  LOGIN_PER_IP: { max: 20, windowMs: 15 * 60 * 1000 },            // 20 attempts per 15min
  REGISTER_PER_IP: { max: 5, windowMs: 60 * 60 * 1000 },          // 5 registrations per hour
  BOOKING_PER_USER: { max: 30, windowMs: 60 * 1000 },             // 30 bookings per minute (UX safety)
  CHECKOUT_PER_USER: { max: 10, windowMs: 60 * 1000 },            // 10 checkout per minute
  PROFILE_UPDATE_PER_USER: { max: 10, windowMs: 5 * 60 * 1000 },  // 10 updates per 5min
  PASSWORD_CHANGE_PER_USER: { max: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15min
  FORGOT_PASSWORD_PER_IP: { max: 5, windowMs: 15 * 60 * 1000 },   // 5 per 15min
  FORGOT_PASSWORD_PER_EMAIL: { max: 3, windowMs: 60 * 60 * 1000 },// 3 per hour per email
};
