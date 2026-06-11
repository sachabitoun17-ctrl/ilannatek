/**
 * Tests for app/api/cron/waitlist-cleanup/route.ts — GET handler
 *
 * Covers:
 *  1. cascadedAt stamp prevents re-processing (set before any other logic)
 *  2. Skip past or cancelled sessions
 *  3. Skip when session is already full (capacity check)
 *  4. Skip when no waitlisted candidate
 *  5. Skip when candidate has insufficient credits
 *  6. Skip when candidate credits are frozen
 *  7. Successful promotion: creates new WaitlistToken and sends email
 *  8. Returns promoted/skipped counts
 *  9. Authorization checks
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPrismaMock, type PrismaMock } from "./prisma-mock";
import { NextRequest } from "next/server";

let mockDb: PrismaMock;

vi.mock("@/lib/db", () => ({
  get db() {
    return mockDb;
  },
}));

const mockSendEmail = vi.fn();
vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
  emailTemplates: new Proxy(
    {},
    { get: () => () => ({ subject: "test", html: "<p>test</p>" }) }
  ),
}));

import { GET } from "@/app/api/cron/waitlist-cleanup/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/cron/waitlist-cleanup", {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
}

const FUTURE_DATE = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
const PAST_DATE = new Date(Date.now() - 60 * 60 * 1000);

const CLASS_TYPE = { id: "ct-1", name: "Yoga Flow", creditCost: 1 };
const LOCATION = { id: "loc-1", name: "Studio A" };

function makeExpiredToken(sessionOverrides: Partial<{
  status: string;
  startTime: Date;
  capacity: number;
}> = {}) {
  return {
    id: "token-expired-1",
    token: "old-token-uuid",
    expiresAt: new Date(Date.now() - 30 * 60 * 1000), // expired 30 min ago
    usedAt: null,
    cascadedAt: null,
    booking: {
      id: "bk-1",
      sessionId: "sess-1",
      session: {
        id: "sess-1",
        status: sessionOverrides.status ?? "SCHEDULED",
        startTime: sessionOverrides.startTime ?? FUTURE_DATE,
        capacity: sessionOverrides.capacity ?? 10,
        classType: CLASS_TYPE,
        location: LOCATION,
      },
    },
  };
}

function makeCandidate(overrides: Partial<{
  creditsBalance: number;
  creditsFrozenUntil: Date | null;
}> = {}) {
  return {
    id: "bk-candidate-1",
    userId: "user-candidate",
    sessionId: "sess-1",
    status: "WAITLIST",
    waitlistPos: 1,
    user: {
      id: "user-candidate",
      email: "candidate@example.com",
      firstName: "Candidate",
      creditsBalance: overrides.creditsBalance ?? 3,
      creditsFrozenUntil: overrides.creditsFrozenUntil ?? null,
    },
    session: {
      id: "sess-1",
      classType: CLASS_TYPE,
      location: LOCATION,
      startTime: FUTURE_DATE,
    },
  };
}

// ── beforeEach ────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockDb = createPrismaMock();
  vi.clearAllMocks();
  mockSendEmail.mockResolvedValue(undefined);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/cron/waitlist-cleanup — authorization", () => {
  it("returns 401 with wrong key", async () => {
    const req = new NextRequest("http://localhost/api/cron/waitlist-cleanup", {
      headers: { authorization: "Bearer wrong" },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 503 when CRON_SECRET is missing", async () => {
    const original = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;

    const req = new NextRequest("http://localhost/api/cron/waitlist-cleanup", {
      headers: { authorization: "Bearer anything" },
    });
    const res = await GET(req);
    expect(res.status).toBe(503);

    process.env.CRON_SECRET = original;
  });
});

describe("GET /api/cron/waitlist-cleanup — cascadedAt stamp", () => {
  it("stamps cascadedAt immediately, before any further processing", async () => {
    const expiredToken = makeExpiredToken();
    mockDb.waitlistToken.findMany.mockResolvedValue([expiredToken]);
    mockDb.waitlistToken.update.mockResolvedValue({ ...expiredToken, cascadedAt: new Date() });

    // Session is past — will be skipped after stamp
    mockDb.waitlistToken.findMany.mockResolvedValue([
      makeExpiredToken({ startTime: PAST_DATE }),
    ]);
    mockDb.waitlistToken.update.mockResolvedValue({});

    await GET(makeRequest());

    // cascadedAt must be set regardless of skip reason
    expect(mockDb.waitlistToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "token-expired-1" },
        data: { cascadedAt: expect.any(Date) },
      })
    );
  });

  it("stamps before checking capacity (even on skip)", async () => {
    const expiredToken = makeExpiredToken({ capacity: 0 }); // capacity 0 → always full
    mockDb.waitlistToken.findMany.mockResolvedValue([expiredToken]);
    mockDb.waitlistToken.update.mockResolvedValue({});
    mockDb.booking.count.mockResolvedValue(10); // confirmedCount >= capacity

    await GET(makeRequest());

    // Must have stamped cascadedAt
    expect(mockDb.waitlistToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { cascadedAt: expect.any(Date) },
      })
    );
    // Must NOT have created a new token (skipped)
    expect(mockDb.waitlistToken.create).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/waitlist-cleanup — skip conditions", () => {
  it("skips past sessions", async () => {
    mockDb.waitlistToken.findMany.mockResolvedValue([
      makeExpiredToken({ startTime: PAST_DATE }),
    ]);
    mockDb.waitlistToken.update.mockResolvedValue({});

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.skipped).toBe(1);
    expect(body.promoted).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("skips cancelled sessions", async () => {
    mockDb.waitlistToken.findMany.mockResolvedValue([
      makeExpiredToken({ status: "CANCELLED" }),
    ]);
    mockDb.waitlistToken.update.mockResolvedValue({});

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.skipped).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("skips when session is at capacity", async () => {
    const expiredToken = makeExpiredToken({ capacity: 5 });
    mockDb.waitlistToken.findMany.mockResolvedValue([expiredToken]);
    mockDb.waitlistToken.update.mockResolvedValue({});
    // Session is full
    mockDb.booking.count.mockResolvedValue(5);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.skipped).toBe(1);
    expect(body.promoted).toBe(0);
  });

  it("skips when no waitlisted candidate exists", async () => {
    const expiredToken = makeExpiredToken();
    mockDb.waitlistToken.findMany.mockResolvedValue([expiredToken]);
    mockDb.waitlistToken.update.mockResolvedValue({});
    mockDb.booking.count.mockResolvedValue(3); // not full
    mockDb.booking.findMany.mockResolvedValueOnce([]) // no candidates; // no candidate

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.skipped).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("skips when candidate has insufficient credits", async () => {
    const expiredToken = makeExpiredToken();
    mockDb.waitlistToken.findMany.mockResolvedValue([expiredToken]);
    mockDb.waitlistToken.update.mockResolvedValue({});
    mockDb.booking.count.mockResolvedValue(3);
    mockDb.booking.findMany.mockResolvedValueOnce([makeCandidate({ creditsBalance: 0 })]); // ineligible, no credits

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.skipped).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("skips when candidate credits are frozen", async () => {
    const frozenUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const expiredToken = makeExpiredToken();
    mockDb.waitlistToken.findMany.mockResolvedValue([expiredToken]);
    mockDb.waitlistToken.update.mockResolvedValue({});
    mockDb.booking.count.mockResolvedValue(3);
    mockDb.booking.findMany.mockResolvedValueOnce([makeCandidate({ creditsFrozenUntil: frozenUntil })]); // frozen

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.skipped).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/waitlist-cleanup — successful promotion", () => {
  it("creates new WaitlistToken and sends email on promotion", async () => {
    const expiredToken = makeExpiredToken();
    mockDb.waitlistToken.findMany.mockResolvedValue([expiredToken]);
    mockDb.waitlistToken.update.mockResolvedValue({});
    mockDb.booking.count.mockResolvedValue(3); // not full
    mockDb.booking.findMany.mockResolvedValueOnce([makeCandidate()]);
    mockDb.waitlistToken.create.mockResolvedValue({ id: "new-token", token: "new-uuid" });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.promoted).toBe(1);
    expect(body.skipped).toBe(0);

    // New token created
    expect(mockDb.waitlistToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bookingId: "bk-candidate-1",
          token: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      })
    );

    // Email sent
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it("new token expiresAt is ~30 minutes from now", async () => {
    const expiredToken = makeExpiredToken();
    mockDb.waitlistToken.findMany.mockResolvedValue([expiredToken]);
    mockDb.waitlistToken.update.mockResolvedValue({});
    mockDb.booking.count.mockResolvedValue(3);
    mockDb.booking.findMany.mockResolvedValueOnce([makeCandidate()]);
    mockDb.waitlistToken.create.mockResolvedValue({ id: "new-token" });

    const beforeTime = Date.now();
    await GET(makeRequest());
    const afterTime = Date.now();

    const createCall = mockDb.waitlistToken.create.mock.calls[0][0];
    const expiresAt = createCall.data.expiresAt as Date;
    const expectedMin = beforeTime + 29 * 60 * 1000;
    const expectedMax = afterTime + 31 * 60 * 1000;

    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax);
  });

  it("returns correct counts with mixed promoted and skipped", async () => {
    const expiredToken1 = makeExpiredToken();
    const expiredToken2 = { ...makeExpiredToken(), id: "token-expired-2" };
    // Second token has a past session — will be skipped
    expiredToken2.booking.session.startTime = PAST_DATE;

    mockDb.waitlistToken.findMany.mockResolvedValue([expiredToken1, expiredToken2]);
    mockDb.waitlistToken.update.mockResolvedValue({});
    // First token: session ok, has capacity, has eligible candidate
    mockDb.booking.count.mockResolvedValue(3);
    mockDb.booking.findMany.mockResolvedValueOnce([makeCandidate()]);
    mockDb.waitlistToken.create.mockResolvedValue({ id: "new-token" });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.expiredFound).toBe(2);
    expect(body.promoted).toBe(1);
    expect(body.skipped).toBe(1);
  });
});

describe("GET /api/cron/waitlist-cleanup — empty run", () => {
  it("returns zero counts when no expired tokens found", async () => {
    mockDb.waitlistToken.findMany.mockResolvedValue([]);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.expiredFound).toBe(0);
    expect(body.promoted).toBe(0);
    expect(body.skipped).toBe(0);
  });
});
