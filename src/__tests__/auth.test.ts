/**
 * Tests for src/lib/auth.ts
 *
 * Covers:
 *  1. requireUser redirects to /login when no session
 *  2. requireAdmin redirects to / when user role is USER
 *  3. requireAdmin redirects to / when user role is INSTRUCTOR
 *  4. requireStaff redirects to / when user role is USER
 *  5. requireStaff allows ADMIN
 *  6. requireStaff allows INSTRUCTOR
 *  7. sessionVersion mismatch causes getCurrentUser to return null
 *  8. createSession / verifyJwt round-trip
 *  9. verifyJwt returns null for tampered tokens
 * 10. Banned or inactive users return null from getCurrentUser
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPrismaMock, type PrismaMock } from "./prisma-mock";

let mockDb: PrismaMock;

vi.mock("@/lib/db", () => ({
  get db() {
    return mockDb;
  },
}));

// Track redirect calls
const mockRedirect = vi.fn((url: string): never => {
  throw new Error(`REDIRECT:${url}`);
});

const mockCookiesGet = vi.fn();
const mockCookiesSet = vi.fn();
const mockCookiesDelete = vi.fn();

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: mockCookiesGet,
    set: mockCookiesSet,
    delete: mockCookiesDelete,
  }),
  headers: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal() as typeof import("react");
  return {
    ...actual,
    cache: (fn: (...args: unknown[]) => unknown) => fn,
  };
});

// Import after mocks
import { createSession, verifyJwt, requireUser, requireAdmin, requireStaff } from "@/lib/auth";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<{
  role: string;
  active: boolean;
  banned: boolean;
  sessionVersion: number;
}> = {}) {
  return {
    id: "user-1",
    email: "alice@example.com",
    firstName: "Alice",
    lastName: "Test",
    phone: null,
    role: overrides.role ?? "USER",
    creditsBalance: 5,
    sessionVersion: overrides.sessionVersion ?? 0,
    active: overrides.active ?? true,
    banned: overrides.banned ?? false,
    creditsFrozenUntil: null,
  };
}

// ── beforeEach ────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockDb = createPrismaMock();
  vi.clearAllMocks();
});

// ── JWT round-trip tests ───────────────────────────────────────────────────────

describe("createSession / verifyJwt", () => {
  it("verifies a freshly created token", async () => {
    const payload = { userId: "user-1", email: "alice@test.com", role: "USER", v: 0 };
    const token = await createSession(payload);

    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // JWT format

    const verified = await verifyJwt(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe("user-1");
    expect(verified?.email).toBe("alice@test.com");
    expect(verified?.role).toBe("USER");
    expect(verified?.v).toBe(0);
  });

  it("returns null for a tampered token", async () => {
    const payload = { userId: "user-1", email: "alice@test.com", role: "USER", v: 0 };
    const token = await createSession(payload);

    // Tamper with the signature
    const parts = token.split(".");
    parts[2] = parts[2].slice(0, -4) + "xxxx";
    const tampered = parts.join(".");

    const result = await verifyJwt(tampered);
    expect(result).toBeNull();
  });

  it("returns null for a completely invalid string", async () => {
    const result = await verifyJwt("not.a.jwt");
    expect(result).toBeNull();
  });
});

// ── getCurrentUser / session version ─────────────────────────────────────────

describe("getCurrentUser — sessionVersion mismatch", () => {
  it("returns null when token version does not match DB version", async () => {
    // Create a token with v=0
    const token = await createSession({ userId: "user-1", email: "alice@test.com", role: "USER", v: 0 });
    mockCookiesGet.mockReturnValue({ value: token });

    // DB has sessionVersion=1 (token was invalidated)
    mockDb.user.findUnique.mockResolvedValue(makeUser({ sessionVersion: 1 }));

    // We can't directly call getCurrentUser in a clean way due to react.cache,
    // so we test via requireUser which calls getCurrentUser
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
  });

  it("returns the user when session version matches", async () => {
    const token = await createSession({ userId: "user-1", email: "alice@test.com", role: "USER", v: 0 });
    mockCookiesGet.mockReturnValue({ value: token });
    mockDb.user.findUnique.mockResolvedValue(makeUser({ sessionVersion: 0 }));

    const user = await requireUser();
    expect(user.id).toBe("user-1");
  });
});

describe("getCurrentUser — inactive / banned users", () => {
  it("returns null (redirects) for inactive user", async () => {
    const token = await createSession({ userId: "user-1", email: "alice@test.com", role: "USER", v: 0 });
    mockCookiesGet.mockReturnValue({ value: token });
    mockDb.user.findUnique.mockResolvedValue(makeUser({ active: false }));

    await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
  });

  it("returns null (redirects) for banned user", async () => {
    const token = await createSession({ userId: "user-1", email: "alice@test.com", role: "USER", v: 0 });
    mockCookiesGet.mockReturnValue({ value: token });
    mockDb.user.findUnique.mockResolvedValue(makeUser({ banned: true }));

    await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
  });
});

// ── requireUser ───────────────────────────────────────────────────────────────

describe("requireUser", () => {
  it("redirects to /login when no cookie", async () => {
    mockCookiesGet.mockReturnValue(undefined);
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects to /login when token is invalid", async () => {
    mockCookiesGet.mockReturnValue({ value: "invalid.token.here" });
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
  });

  it("returns user for valid session", async () => {
    const token = await createSession({ userId: "user-1", email: "alice@test.com", role: "USER", v: 0 });
    mockCookiesGet.mockReturnValue({ value: token });
    mockDb.user.findUnique.mockResolvedValue(makeUser());

    const user = await requireUser();
    expect(user.id).toBe("user-1");
  });
});

// ── requireAdmin ──────────────────────────────────────────────────────────────

describe("requireAdmin", () => {
  it("redirects to / for USER role", async () => {
    const token = await createSession({ userId: "user-1", email: "alice@test.com", role: "USER", v: 0 });
    mockCookiesGet.mockReturnValue({ value: token });
    mockDb.user.findUnique.mockResolvedValue(makeUser({ role: "USER" }));

    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/");
  });

  it("redirects to / for INSTRUCTOR role", async () => {
    const token = await createSession({ userId: "user-1", email: "alice@test.com", role: "INSTRUCTOR", v: 0 });
    mockCookiesGet.mockReturnValue({ value: token });
    mockDb.user.findUnique.mockResolvedValue(makeUser({ role: "INSTRUCTOR" }));

    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/");
  });

  it("returns admin user for ADMIN role", async () => {
    const token = await createSession({ userId: "user-1", email: "alice@test.com", role: "ADMIN", v: 0 });
    mockCookiesGet.mockReturnValue({ value: token });
    mockDb.user.findUnique.mockResolvedValue(makeUser({ role: "ADMIN" }));

    const user = await requireAdmin();
    expect(user.role).toBe("ADMIN");
  });

  it("redirects to /login when not authenticated", async () => {
    mockCookiesGet.mockReturnValue(undefined);
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/login");
  });
});

// ── requireStaff ──────────────────────────────────────────────────────────────

describe("requireStaff", () => {
  it("redirects to / for USER role", async () => {
    const token = await createSession({ userId: "user-1", email: "alice@test.com", role: "USER", v: 0 });
    mockCookiesGet.mockReturnValue({ value: token });
    mockDb.user.findUnique.mockResolvedValue(makeUser({ role: "USER" }));

    await expect(requireStaff()).rejects.toThrow("REDIRECT:/");
  });

  it("allows INSTRUCTOR role", async () => {
    const token = await createSession({ userId: "user-1", email: "alice@test.com", role: "INSTRUCTOR", v: 0 });
    mockCookiesGet.mockReturnValue({ value: token });
    mockDb.user.findUnique.mockResolvedValue(makeUser({ role: "INSTRUCTOR" }));

    const user = await requireStaff();
    expect(user.role).toBe("INSTRUCTOR");
  });

  it("allows ADMIN role", async () => {
    const token = await createSession({ userId: "user-1", email: "alice@test.com", role: "ADMIN", v: 0 });
    mockCookiesGet.mockReturnValue({ value: token });
    mockDb.user.findUnique.mockResolvedValue(makeUser({ role: "ADMIN" }));

    const user = await requireStaff();
    expect(user.role).toBe("ADMIN");
  });

  it("redirects to /login when not authenticated", async () => {
    mockCookiesGet.mockReturnValue(undefined);
    await expect(requireStaff()).rejects.toThrow("REDIRECT:/login");
  });
});
