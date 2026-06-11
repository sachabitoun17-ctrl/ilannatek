/**
 * Tests for src/lib/booking.ts — bookSession and cancelBooking
 *
 * Covers:
 *  1. Credit deduction atomicity — creditsBalance decremented for confirmed booking
 *  2. Overbooking prevention — user put on waitlist when capacity full
 *  3. Cancellation cutoff — late-cancel triggers fee, early cancel gives full refund
 *  4. Late cancel fee — fee is min(lateCancelFee, creditsUsed)
 *  5. No double-booking — error when already registered
 *  6. Banned user cannot book
 *  7. Frozen credits cannot book
 *  8. Insufficient credits error
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPrismaMock, type PrismaMock } from "./prisma-mock";

let mockDb: PrismaMock;

vi.mock("@/lib/db", () => ({
  get db() {
    return mockDb;
  },
}));

import { bookSession, cancelBooking } from "@/lib/booking";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FUTURE_DATE = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days from now
const SOON_DATE = new Date(Date.now() + 30 * 60 * 1000); // 30 min from now (within cutoff)
const PAST_DATE = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

const CLASS_TYPE = {
  id: "ct-1",
  name: "Yoga Flow",
  creditCost: 1,
};

const LOCATION = {
  id: "loc-1",
  name: "Studio A",
};

const INSTRUCTOR = {
  id: "inst-1",
  firstName: "Claire",
  lastName: "Martin",
  email: "claire@studio.fr",
};

function makeSession(overrides: Partial<{
  startTime: Date;
  capacity: number;
  status: string;
  cancellationCutoffMin: number | null;
}> = {}) {
  return {
    id: "sess-1",
    startTime: overrides.startTime ?? FUTURE_DATE,
    capacity: overrides.capacity ?? 10,
    status: overrides.status ?? "SCHEDULED",
    cancellationCutoffMin: overrides.cancellationCutoffMin ?? null,
    classType: CLASS_TYPE,
    location: LOCATION,
    instructor: INSTRUCTOR,
    instructorId: INSTRUCTOR.id,
  };
}

function makeUser(overrides: Partial<{
  creditsBalance: number;
  banned: boolean;
  creditsFrozenUntil: Date | null;
}> = {}) {
  return {
    id: "user-1",
    email: "bob@example.com",
    firstName: "Bob",
    lastName: "Smith",
    creditsBalance: overrides.creditsBalance ?? 5,
    banned: overrides.banned ?? false,
    creditsFrozenUntil: overrides.creditsFrozenUntil ?? null,
  };
}

// ── beforeEach ────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockDb = createPrismaMock();
  vi.clearAllMocks();
});

// ── bookSession tests ─────────────────────────────────────────────────────────

describe("bookSession — confirmed booking", () => {
  it("deducts credits and creates CREDIT_USE transaction", async () => {
    const session = makeSession();
    const user = makeUser({ creditsBalance: 3 });

    mockDb.$queryRaw.mockResolvedValue([]);
    mockDb.session.findUnique.mockResolvedValue(session);
    mockDb.booking.findUnique.mockResolvedValue(null); // no existing booking
    mockDb.booking.count
      .mockResolvedValueOnce(5) // confirmedCount
      .mockResolvedValueOnce(0); // waitlistCount
    mockDb.user.findUnique.mockResolvedValue(user);
    mockDb.booking.create.mockResolvedValue({ id: "bk-1", status: "CONFIRMED" });
    mockDb.user.update.mockResolvedValue({ ...user, creditsBalance: 2 });
    mockDb.transaction.create.mockResolvedValue({ id: "tx-1" });

    const result = await bookSession(user.id, session.id);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe("CONFIRMED");
    }

    // Credit decrement
    const userUpdate = mockDb.user.update.mock.calls[0][0];
    expect(userUpdate.data.creditsBalance).toEqual({ decrement: CLASS_TYPE.creditCost });

    // CREDIT_USE transaction created
    const txCreate = mockDb.transaction.create.mock.calls[0][0];
    expect(txCreate.data.type).toBe("CREDIT_USE");
    expect(txCreate.data.creditsDelta).toBe(-CLASS_TYPE.creditCost);
  });
});

describe("bookSession — overbooking prevention", () => {
  it("puts user on WAITLIST when session is at capacity", async () => {
    const session = makeSession({ capacity: 5 });
    const user = makeUser();

    mockDb.$queryRaw.mockResolvedValue([]);
    mockDb.session.findUnique.mockResolvedValue(session);
    mockDb.booking.findUnique.mockResolvedValue(null);
    mockDb.booking.count
      .mockResolvedValueOnce(5) // confirmedCount == capacity
      .mockResolvedValueOnce(2); // waitlistCount
    mockDb.user.findUnique.mockResolvedValue(user);
    mockDb.booking.create.mockResolvedValue({ id: "bk-2", status: "WAITLIST" });

    const result = await bookSession(user.id, session.id);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe("WAITLIST");
      expect(result.position).toBe(3); // waitlistCount + 1
    }

    // No credits should be deducted for a waitlisted booking
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });
});

describe("bookSession — error cases", () => {
  it("rejects booking for past session", async () => {
    const session = makeSession({ startTime: PAST_DATE });

    mockDb.$queryRaw.mockResolvedValue([]);
    mockDb.session.findUnique.mockResolvedValue(session);

    const result = await bookSession("user-1", session.id);
    expect(result.ok).toBe(false);
  });

  it("rejects booking for cancelled session", async () => {
    const session = makeSession({ status: "CANCELLED" });

    mockDb.$queryRaw.mockResolvedValue([]);
    mockDb.session.findUnique.mockResolvedValue(session);

    const result = await bookSession("user-1", session.id);
    expect(result.ok).toBe(false);
  });

  it("rejects when user is banned", async () => {
    const session = makeSession();
    const user = makeUser({ banned: true });

    mockDb.$queryRaw.mockResolvedValue([]);
    mockDb.session.findUnique.mockResolvedValue(session);
    mockDb.booking.findUnique.mockResolvedValue(null);
    mockDb.booking.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mockDb.user.findUnique.mockResolvedValue(user);

    const result = await bookSession(user.id, session.id);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/suspendu/i);
    }
  });

  it("rejects when credits are frozen", async () => {
    const session = makeSession();
    const frozenUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const user = makeUser({ creditsFrozenUntil: frozenUntil });

    mockDb.$queryRaw.mockResolvedValue([]);
    mockDb.session.findUnique.mockResolvedValue(session);
    mockDb.booking.findUnique.mockResolvedValue(null);
    mockDb.booking.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mockDb.user.findUnique.mockResolvedValue(user);

    const result = await bookSession(user.id, session.id);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/gelés/i);
    }
  });

  it("rejects when user has insufficient credits", async () => {
    const session = makeSession();
    const user = makeUser({ creditsBalance: 0 });

    mockDb.$queryRaw.mockResolvedValue([]);
    mockDb.session.findUnique.mockResolvedValue(session);
    mockDb.booking.findUnique.mockResolvedValue(null);
    mockDb.booking.count
      .mockResolvedValueOnce(3) // confirmedCount < capacity
      .mockResolvedValueOnce(0);
    mockDb.user.findUnique.mockResolvedValue(user);

    const result = await bookSession(user.id, session.id);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/solde insuffisant/i);
    }
  });

  it("rejects when user is already registered (not cancelled)", async () => {
    const session = makeSession();
    const user = makeUser();

    mockDb.$queryRaw.mockResolvedValue([]);
    mockDb.session.findUnique.mockResolvedValue(session);
    mockDb.booking.findUnique.mockResolvedValue({
      id: "bk-existing",
      status: "CONFIRMED",
      creditsUsed: 1,
    });
    mockDb.booking.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(0);
    mockDb.user.findUnique.mockResolvedValue(user);

    const result = await bookSession(user.id, session.id);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/déjà inscrit/i);
    }
  });

  it("returns error when session not found", async () => {
    mockDb.$queryRaw.mockResolvedValue([]);
    mockDb.session.findUnique.mockResolvedValue(null);

    const result = await bookSession("user-1", "nonexistent");
    expect(result.ok).toBe(false);
  });
});

// ── cancelBooking tests ───────────────────────────────────────────────────────

describe("cancelBooking — early cancel (before cutoff)", () => {
  it("gives full credit refund with no fee", async () => {
    const booking = {
      id: "bk-1",
      userId: "user-1",
      status: "CONFIRMED",
      creditsUsed: 1,
      feeApplied: 0,
      session: {
        id: "sess-1",
        startTime: FUTURE_DATE, // well in the future, before cutoff
        cancellationCutoffMin: null,
        classType: CLASS_TYPE,
        location: LOCATION,
      },
      user: {
        id: "user-1",
        email: "bob@example.com",
        firstName: "Bob",
      },
    };

    mockDb.booking.findUnique.mockResolvedValue(booking);
    mockDb.booking.update.mockResolvedValue({ ...booking, status: "CANCELLED" });
    mockDb.user.update.mockResolvedValue({ id: "user-1", creditsBalance: 5 });
    mockDb.transaction.create.mockResolvedValue({ id: "tx-refund" });
    mockDb.booking.findMany.mockResolvedValue([]); // no waitlist

    const result = await cancelBooking("user-1", "bk-1");

    expect(result.ok).toBe(true);
    // Booking updated to CANCELLED with feeApplied: 0
    const bkUpdate = mockDb.booking.update.mock.calls[0][0];
    expect(bkUpdate.data.status).toBe("CANCELLED");
    expect(bkUpdate.data.feeApplied).toBe(0);

    // User refunded 1 credit
    const userUpdate = mockDb.user.update.mock.calls[0][0];
    expect(userUpdate.data.creditsBalance).toEqual({ increment: 1 });

    // CREDIT_REFUND transaction
    const txCreate = mockDb.transaction.create.mock.calls[0][0];
    expect(txCreate.data.type).toBe("CREDIT_REFUND");
  });
});

describe("cancelBooking — late cancel (within cutoff)", () => {
  it("applies lateCancelFee and refunds remainder", async () => {
    // Session starts in 30 minutes (within 120-min cutoff)
    const booking = {
      id: "bk-1",
      userId: "user-1",
      status: "CONFIRMED",
      creditsUsed: 1,
      feeApplied: 0,
      session: {
        id: "sess-1",
        startTime: SOON_DATE,
        cancellationCutoffMin: null,
        classType: CLASS_TYPE,
        location: LOCATION,
      },
      user: {
        id: "user-1",
        email: "bob@example.com",
        firstName: "Bob",
      },
    };

    mockDb.booking.findUnique.mockResolvedValue(booking);
    mockDb.booking.update.mockResolvedValue({ ...booking, status: "CANCELLED" });
    mockDb.user.update.mockResolvedValue({ id: "user-1", creditsBalance: 4 });
    mockDb.transaction.create.mockResolvedValue({ id: "tx-1" });
    mockDb.booking.findMany.mockResolvedValue([]); // no waitlist

    const result = await cancelBooking("user-1", "bk-1");

    expect(result.ok).toBe(true);

    // feeApplied should equal min(lateCancelFee=1, creditsUsed=1) = 1
    const bkUpdate = mockDb.booking.update.mock.calls[0][0];
    expect(bkUpdate.data.feeApplied).toBe(1);

    // Refund amount = creditsUsed - feeApplied = 1 - 1 = 0
    // So user.update for creditsBalance should NOT be called (refundAmount === 0)
    const userUpdateCalls = mockDb.user.update.mock.calls;
    const refundCall = userUpdateCalls.find(
      (call: any[]) => call[0].data?.creditsBalance?.increment > 0
    );
    expect(refundCall).toBeUndefined();

    // A LATE_CANCEL_FEE transaction should be created
    const lateCancelTx = mockDb.transaction.create.mock.calls.find(
      (call: any[]) => call[0].data?.type === "LATE_CANCEL_FEE"
    );
    expect(lateCancelTx).toBeDefined();
  });
});

describe("cancelBooking — admin bypass", () => {
  it("admin cancellation gives full refund regardless of timing", async () => {
    const booking = {
      id: "bk-1",
      userId: "user-1",
      status: "CONFIRMED",
      creditsUsed: 1,
      feeApplied: 0,
      session: {
        id: "sess-1",
        startTime: SOON_DATE, // within cutoff for normal user
        cancellationCutoffMin: null,
        classType: CLASS_TYPE,
        location: LOCATION,
      },
      user: {
        id: "user-1",
        email: "bob@example.com",
        firstName: "Bob",
      },
    };

    mockDb.booking.findUnique.mockResolvedValue(booking);
    mockDb.booking.update.mockResolvedValue({ ...booking, status: "CANCELLED" });
    mockDb.user.update.mockResolvedValue({ id: "user-1", creditsBalance: 5 });
    mockDb.transaction.create.mockResolvedValue({ id: "tx-1" });
    mockDb.booking.findMany.mockResolvedValue([]);

    const result = await cancelBooking("admin-1", "bk-1", true /* asAdmin */);

    expect(result.ok).toBe(true);

    // Admin cancel: no fee applied
    const bkUpdate = mockDb.booking.update.mock.calls[0][0];
    expect(bkUpdate.data.feeApplied).toBe(0);

    // Full refund
    const userUpdate = mockDb.user.update.mock.calls[0][0];
    expect(userUpdate.data.creditsBalance).toEqual({ increment: 1 });
  });
});

describe("cancelBooking — error cases", () => {
  it("returns error when booking not found", async () => {
    mockDb.booking.findUnique.mockResolvedValue(null);
    const result = await cancelBooking("user-1", "nonexistent");
    expect(result.ok).toBe(false);
  });

  it("returns error when booking is already cancelled", async () => {
    mockDb.booking.findUnique.mockResolvedValue({
      id: "bk-1",
      userId: "user-1",
      status: "CANCELLED",
      creditsUsed: 0,
      feeApplied: 0,
      session: { startTime: FUTURE_DATE, cancellationCutoffMin: null, classType: CLASS_TYPE, location: LOCATION },
      user: { id: "user-1", email: "bob@example.com", firstName: "Bob" },
    });

    const result = await cancelBooking("user-1", "bk-1");
    expect(result.ok).toBe(false);
  });

  it("returns error when user tries to cancel someone else's booking", async () => {
    mockDb.booking.findUnique.mockResolvedValue({
      id: "bk-1",
      userId: "user-other",
      status: "CONFIRMED",
      creditsUsed: 1,
      feeApplied: 0,
      session: { startTime: FUTURE_DATE, cancellationCutoffMin: null, classType: CLASS_TYPE, location: LOCATION },
      user: { id: "user-other", email: "other@example.com", firstName: "Other" },
    });

    const result = await cancelBooking("user-1", "bk-1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/autorisé/i);
    }
  });
});
