/**
 * Tests for app/admin/emails/broadcast/actions.ts — broadcastEmailAction
 *
 * Covers:
 *  1. Role filter is USER (and INSTRUCTOR), NOT "MEMBER"
 *  2. emailOptIn filter is enforced — opted-out users are excluded
 *  3. Returns error when subject is missing
 *  4. Returns error when body is missing
 *  5. Returns error when no recipients match
 *  6. audience=zero_credits filters creditsBalance: 0
 *  7. audience=active_sub filters users with active subscriptions
 *  8. Default audience includes all active users
 *  9. Counts sent/failed correctly
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPrismaMock, type PrismaMock } from "./prisma-mock";

let mockDb: PrismaMock;

vi.mock("@/lib/db", () => ({
  get db() {
    return mockDb;
  },
}));

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/auth", () => ({
  requireAdmin: () => mockRequireAdmin(),
  requireStaff: vi.fn(),
  requireUser: vi.fn(),
}));

// We need to control sendEmail for individual tests
const mockSendEmail = vi.fn();
vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
  emailTemplates: new Proxy(
    {},
    { get: () => () => ({ subject: "test", html: "<p>test</p>" }) }
  ),
}));

import { broadcastEmailAction } from "@/app/admin/emails/broadcast/actions";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ADMIN_USER = {
  id: "admin-1",
  role: "ADMIN",
  email: "admin@studio.fr",
  firstName: "Admin",
};

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.append(key, value);
  }
  return fd;
}

// ── beforeEach ────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockDb = createPrismaMock();
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue(ADMIN_USER);
  mockSendEmail.mockResolvedValue(undefined);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("broadcastEmailAction — validation", () => {
  it("returns error when subject is empty", async () => {
    const fd = makeFormData({ subject: "", body: "Hello world", audience: "all" });
    const result = await broadcastEmailAction(fd);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/sujet/i);
    }
  });

  it("returns error when body is empty", async () => {
    const fd = makeFormData({ subject: "Test Subject", body: "", audience: "all" });
    const result = await broadcastEmailAction(fd);
    expect(result.ok).toBe(false);
  });

  it("returns error when subject exceeds 200 characters", async () => {
    const fd = makeFormData({
      subject: "x".repeat(201),
      body: "Hello",
      audience: "all",
    });
    const result = await broadcastEmailAction(fd);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/sujet trop long/i);
    }
  });

  it("returns error when no recipients match", async () => {
    mockDb.user.findMany.mockResolvedValue([]);

    const fd = makeFormData({
      subject: "Newsletter",
      body: "Hello members",
      audience: "all",
    });

    const result = await broadcastEmailAction(fd);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/destinataire/i);
    }
  });
});

describe("broadcastEmailAction — role and emailOptIn filters", () => {
  it("queries with role in [USER, INSTRUCTOR] — not MEMBER", async () => {
    mockDb.user.findMany.mockResolvedValue([
      { id: "u1", email: "user@example.com", firstName: "User" },
    ]);

    const fd = makeFormData({
      subject: "Hello",
      body: "World",
      audience: "all",
    });

    await broadcastEmailAction(fd);

    const queryArgs = mockDb.user.findMany.mock.calls[0][0];
    // Must include role filter with USER (not MEMBER)
    expect(queryArgs.where.role).toEqual({ in: ["USER", "INSTRUCTOR"] });
    // Must NOT include MEMBER
    expect(queryArgs.where.role.in).not.toContain("MEMBER");
  });

  it("queries with emailOptIn: true", async () => {
    mockDb.user.findMany.mockResolvedValue([
      { id: "u1", email: "user@example.com", firstName: "User" },
    ]);

    const fd = makeFormData({
      subject: "Hello",
      body: "World",
      audience: "all",
    });

    await broadcastEmailAction(fd);

    const queryArgs = mockDb.user.findMany.mock.calls[0][0];
    expect(queryArgs.where.emailOptIn).toBe(true);
  });

  it("always includes active: true in query", async () => {
    mockDb.user.findMany.mockResolvedValue([
      { id: "u1", email: "user@example.com", firstName: "User" },
    ]);

    const fd = makeFormData({
      subject: "Hello",
      body: "World",
      audience: "all",
    });

    await broadcastEmailAction(fd);

    const queryArgs = mockDb.user.findMany.mock.calls[0][0];
    expect(queryArgs.where.active).toBe(true);
  });
});

describe("broadcastEmailAction — audience filtering", () => {
  it("audience=zero_credits adds creditsBalance: 0 filter", async () => {
    mockDb.user.findMany.mockResolvedValue([
      { id: "u1", email: "user@example.com", firstName: "User" },
    ]);

    const fd = makeFormData({
      subject: "Recharge",
      body: "Your credits are empty",
      audience: "zero_credits",
    });

    await broadcastEmailAction(fd);

    const queryArgs = mockDb.user.findMany.mock.calls[0][0];
    expect(queryArgs.where.creditsBalance).toBe(0);
  });

  it("audience=active_sub adds subscription filter", async () => {
    mockDb.user.findMany.mockResolvedValue([
      { id: "u1", email: "user@example.com", firstName: "User" },
    ]);

    const fd = makeFormData({
      subject: "Subscriber news",
      body: "Hello subscribers",
      audience: "active_sub",
    });

    await broadcastEmailAction(fd);

    const queryArgs = mockDb.user.findMany.mock.calls[0][0];
    expect(queryArgs.where.subscriptions).toBeDefined();
    expect(queryArgs.where.subscriptions.some).toBeDefined();
  });

  it("audience=no_sub filters users without active subscription", async () => {
    mockDb.user.findMany.mockResolvedValue([
      { id: "u1", email: "user@example.com", firstName: "User" },
    ]);

    const fd = makeFormData({
      subject: "No sub",
      body: "Hello non-subscribers",
      audience: "no_sub",
    });

    await broadcastEmailAction(fd);

    const queryArgs = mockDb.user.findMany.mock.calls[0][0];
    expect(queryArgs.where.subscriptions).toBeDefined();
    expect(queryArgs.where.subscriptions.none).toBeDefined();
  });

  it("default audience includes all active users (no extra filters)", async () => {
    mockDb.user.findMany.mockResolvedValue([
      { id: "u1", email: "user@example.com", firstName: "User" },
    ]);

    const fd = makeFormData({
      subject: "All members",
      body: "Hello everyone",
      audience: "all",
    });

    await broadcastEmailAction(fd);

    const queryArgs = mockDb.user.findMany.mock.calls[0][0];
    // No creditsBalance or subscriptions filter
    expect(queryArgs.where.creditsBalance).toBeUndefined();
    expect(queryArgs.where.subscriptions).toBeUndefined();
  });
});

describe("broadcastEmailAction — send counting", () => {
  it("reports correct sent count on success", async () => {
    const members = [
      { id: "u1", email: "user1@example.com", firstName: "User1" },
      { id: "u2", email: "user2@example.com", firstName: "User2" },
    ];
    mockDb.user.findMany.mockResolvedValue(members);
    mockSendEmail.mockResolvedValue(undefined); // all succeed

    const fd = makeFormData({
      subject: "Test",
      body: "Hello",
      audience: "all",
    });

    const result = await broadcastEmailAction(fd);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message).toMatch(/2 membre/);
    }
    // sendEmail called for each member
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
  });

  it("reports failed count when some emails throw", async () => {
    const members = [
      { id: "u1", email: "user1@example.com", firstName: "User1" },
      { id: "u2", email: "user2@example.com", firstName: "User2" },
      { id: "u3", email: "user3@example.com", firstName: "User3" },
    ];
    mockDb.user.findMany.mockResolvedValue(members);
    mockSendEmail
      .mockResolvedValueOnce(undefined) // first succeeds
      .mockRejectedValueOnce(new Error("SMTP error")) // second fails
      .mockResolvedValueOnce(undefined); // third succeeds

    const fd = makeFormData({
      subject: "Test",
      body: "Hello",
      audience: "all",
    });

    const result = await broadcastEmailAction(fd);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message).toMatch(/2 membre/);
      expect(result.message).toMatch(/1 échec/);
    }
  });
});
