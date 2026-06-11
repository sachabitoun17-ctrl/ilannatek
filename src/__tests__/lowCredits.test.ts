/**
 * Tests for app/api/cron/low-credits/route.ts — GET handler
 *
 * Covers:
 *  1. Dedupe: users with lowCreditsNotifiedAt within last 7 days are excluded
 *  2. Dedupe: users with lowCreditsNotifiedAt = null are always included
 *  3. After sending, lowCreditsNotifiedAt is updated for all notified users
 *  4. Returns sent count in response
 *  5. Authorization: missing CRON_SECRET returns 503
 *  6. Authorization: wrong key returns 401
 *  7. No emails sent when user list is empty
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

import { GET } from "@/app/api/cron/low-credits/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(authHeader?: string): NextRequest {
  return new NextRequest("http://localhost/api/cron/low-credits", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

function validRequest(): NextRequest {
  return makeRequest(`Bearer ${process.env.CRON_SECRET}`);
}

// ── beforeEach ────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockDb = createPrismaMock();
  vi.clearAllMocks();
  mockSendEmail.mockResolvedValue(undefined);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/cron/low-credits — authorization", () => {
  it("returns 503 when CRON_SECRET is not configured", async () => {
    const original = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;

    const req = makeRequest("Bearer anything");
    const res = await GET(req);

    expect(res.status).toBe(503);
    process.env.CRON_SECRET = original;
  });

  it("returns 401 when authorization header is wrong", async () => {
    const req = makeRequest("Bearer wrong-secret");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when authorization header is missing", async () => {
    const req = makeRequest();
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/cron/low-credits — dedupe logic", () => {
  it("includes users with lowCreditsNotifiedAt = null", async () => {
    const users = [
      { id: "u1", email: "a@x.com", firstName: "Alice", creditsBalance: 1 },
    ];
    mockDb.user.findMany.mockResolvedValue(users);
    mockDb.user.updateMany.mockResolvedValue({ count: 1 });

    const res = await GET(validRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sent).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it("updates lowCreditsNotifiedAt for all notified users", async () => {
    const users = [
      { id: "u1", email: "a@x.com", firstName: "Alice", creditsBalance: 1 },
      { id: "u2", email: "b@x.com", firstName: "Bob", creditsBalance: 1 },
    ];
    mockDb.user.findMany.mockResolvedValue(users);
    mockDb.user.updateMany.mockResolvedValue({ count: 2 });

    await GET(validRequest());

    expect(mockDb.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["u1", "u2"] } },
        data: { lowCreditsNotifiedAt: expect.any(Date) },
      })
    );
  });

  it("does not call updateMany when no users found", async () => {
    mockDb.user.findMany.mockResolvedValue([]);

    const res = await GET(validRequest());
    const body = await res.json();

    expect(body.sent).toBe(0);
    expect(mockDb.user.updateMany).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("query includes OR clause for lowCreditsNotifiedAt deduplication", async () => {
    mockDb.user.findMany.mockResolvedValue([]);

    await GET(validRequest());

    const queryArgs = mockDb.user.findMany.mock.calls[0][0];
    // Verify the OR condition exists for deduplication
    expect(queryArgs.where.OR).toBeDefined();
    expect(Array.isArray(queryArgs.where.OR)).toBe(true);

    const nullCondition = queryArgs.where.OR.find(
      (c: Record<string, unknown>) => c.lowCreditsNotifiedAt === null
    );
    expect(nullCondition).toBeDefined();

    const ltCondition = queryArgs.where.OR.find(
      (c: Record<string, unknown>) => c.lowCreditsNotifiedAt != null
    );
    expect(ltCondition).toBeDefined();
  });

  it("query filters creditsBalance: 1", async () => {
    mockDb.user.findMany.mockResolvedValue([]);

    await GET(validRequest());

    const queryArgs = mockDb.user.findMany.mock.calls[0][0];
    expect(queryArgs.where.creditsBalance).toBe(1);
  });

  it("query requires emailOptIn: true", async () => {
    mockDb.user.findMany.mockResolvedValue([]);

    await GET(validRequest());

    const queryArgs = mockDb.user.findMany.mock.calls[0][0];
    expect(queryArgs.where.emailOptIn).toBe(true);
  });

  it("returns correct sent count", async () => {
    const users = Array.from({ length: 5 }, (_, i) => ({
      id: `u${i}`,
      email: `user${i}@example.com`,
      firstName: `User${i}`,
      creditsBalance: 1,
    }));
    mockDb.user.findMany.mockResolvedValue(users);
    mockDb.user.updateMany.mockResolvedValue({ count: 5 });

    const res = await GET(validRequest());
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.sent).toBe(5);
    expect(mockSendEmail).toHaveBeenCalledTimes(5);
  });
});
