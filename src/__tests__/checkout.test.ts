/**
 * Tests for src/lib/checkout.ts — grantPlanPurchase
 *
 * Covers:
 *  1. introOnly plan blocks users who already have a paid/free transaction
 *  2. maxPerUser quota enforcement
 *  3. creditsBalance is incremented by the correct amount
 *  4. stripeSubscriptionId is stored on the Subscription row
 *  5. Idempotency: duplicate call with same stripeRef is a no-op (P2002 guard)
 *  6. Free plan creates transaction with paymentStatus FREE
 *  7. CREDIT_PACK uses creditsAmount, SUBSCRIPTION uses creditsPerCycle
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPrismaMock, type PrismaMock } from "./prisma-mock";

// ── Module mock wiring ────────────────────────────────────────────────────────
// We mock the db module BEFORE importing the function under test so that
// checkout.ts picks up our mock when it calls `import { db } from "./db"`.

let mockDb: PrismaMock;

vi.mock("@/lib/db", () => ({
  get db() {
    return mockDb;
  },
}));

vi.mock("@/lib/promo", () => ({
  evaluatePromoCode: vi.fn(),
  recordPromoRedemption: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/stripe", () => ({
  stripeEnabled: vi.fn().mockReturnValue(false),
  createOrGetCustomer: vi.fn(),
  createCheckoutSession: vi.fn(),
}));

// Import AFTER mocks are set up
import { grantPlanPurchase, startCheckout } from "@/lib/checkout";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_USER = {
  id: "user-1",
  email: "alice@example.com",
  firstName: "Alice",
  lastName: "Test",
  creditsBalance: 5,
  sessionVersion: 1,
  active: true,
  banned: false,
  stripeCustomerId: null,
};

const CREDIT_PACK_PLAN = {
  id: "plan-pack-1",
  name: "Pack 5 séances",
  type: "CREDIT_PACK",
  priceCents: 5000,
  creditsAmount: 5,
  creditsPerCycle: null,
  active: true,
  introOnly: false,
  maxPerUser: null,
  stripePriceId: null,
  intervalDays: null,
};

const SUBSCRIPTION_PLAN = {
  id: "plan-sub-1",
  name: "Abonnement Mensuel",
  type: "SUBSCRIPTION",
  priceCents: 9900,
  creditsAmount: null,
  creditsPerCycle: 10,
  active: true,
  introOnly: false,
  maxPerUser: null,
  stripePriceId: null,
  intervalDays: 30,
};

const INTRO_PLAN = {
  ...CREDIT_PACK_PLAN,
  id: "plan-intro-1",
  name: "Offre Découverte",
  introOnly: true,
};

// ── beforeEach ───────────────────────────────────────────────────────────────

beforeEach(() => {
  mockDb = createPrismaMock();
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("grantPlanPurchase — CREDIT_PACK", () => {
  it("increments creditsBalance by creditsAmount", async () => {
    mockDb.plan.findUnique.mockResolvedValue(CREDIT_PACK_PLAN);
    mockDb.user.findUnique.mockResolvedValue(BASE_USER);
    mockDb.transaction.findUnique.mockResolvedValue(null); // no existing stripeRef
    mockDb.transaction.create.mockResolvedValue({ id: "tx-1" });
    mockDb.user.update.mockResolvedValue({ ...BASE_USER, creditsBalance: 10 });

    const result = await grantPlanPurchase({
      userId: BASE_USER.id,
      planId: CREDIT_PACK_PLAN.id,
      paidCents: 5000,
      stripeRef: null,
    });

    expect(result.ok).toBe(true);
    // user.update must be called with increment: 5
    const updateCall = mockDb.user.update.mock.calls[0][0];
    expect(updateCall.data.creditsBalance).toEqual({ increment: 5 });
  });

  it("includes bonusCredits in the increment", async () => {
    mockDb.plan.findUnique.mockResolvedValue(CREDIT_PACK_PLAN);
    mockDb.user.findUnique.mockResolvedValue(BASE_USER);
    mockDb.transaction.findUnique.mockResolvedValue(null);
    mockDb.transaction.create.mockResolvedValue({ id: "tx-1" });
    mockDb.user.update.mockResolvedValue({ ...BASE_USER, creditsBalance: 12 });

    await grantPlanPurchase({
      userId: BASE_USER.id,
      planId: CREDIT_PACK_PLAN.id,
      paidCents: 5000,
      bonusCredits: 2,
      stripeRef: null,
    });

    const updateCall = mockDb.user.update.mock.calls[0][0];
    expect(updateCall.data.creditsBalance).toEqual({ increment: 7 }); // 5 + 2
  });

  it("creates transaction with paymentStatus FREE when paidCents is 0", async () => {
    mockDb.plan.findUnique.mockResolvedValue(CREDIT_PACK_PLAN);
    mockDb.user.findUnique.mockResolvedValue(BASE_USER);
    mockDb.transaction.findUnique.mockResolvedValue(null);
    mockDb.transaction.create.mockResolvedValue({ id: "tx-1" });
    mockDb.user.update.mockResolvedValue({ ...BASE_USER, creditsBalance: 10 });

    await grantPlanPurchase({
      userId: BASE_USER.id,
      planId: CREDIT_PACK_PLAN.id,
      paidCents: 0,
      stripeRef: null,
    });

    const txCreate = mockDb.transaction.create.mock.calls[0][0];
    expect(txCreate.data.paymentStatus).toBe("FREE");
  });

  it("creates transaction with paymentStatus PAID when paidCents > 0", async () => {
    mockDb.plan.findUnique.mockResolvedValue(CREDIT_PACK_PLAN);
    mockDb.user.findUnique.mockResolvedValue(BASE_USER);
    mockDb.transaction.findUnique.mockResolvedValue(null);
    mockDb.transaction.create.mockResolvedValue({ id: "tx-1" });
    mockDb.user.update.mockResolvedValue({ ...BASE_USER, creditsBalance: 10 });

    await grantPlanPurchase({
      userId: BASE_USER.id,
      planId: CREDIT_PACK_PLAN.id,
      paidCents: 5000,
      stripeRef: null,
    });

    const txCreate = mockDb.transaction.create.mock.calls[0][0];
    expect(txCreate.data.paymentStatus).toBe("PAID");
  });
});

describe("grantPlanPurchase — SUBSCRIPTION", () => {
  it("uses creditsPerCycle for the credits delta", async () => {
    mockDb.plan.findUnique.mockResolvedValue(SUBSCRIPTION_PLAN);
    mockDb.user.findUnique.mockResolvedValue(BASE_USER);
    mockDb.transaction.findUnique.mockResolvedValue(null);
    mockDb.transaction.create.mockResolvedValue({ id: "tx-1" });
    mockDb.user.update.mockResolvedValue({ ...BASE_USER, creditsBalance: 15 });
    mockDb.subscription.create.mockResolvedValue({ id: "sub-1" });

    await grantPlanPurchase({
      userId: BASE_USER.id,
      planId: SUBSCRIPTION_PLAN.id,
      paidCents: 9900,
      stripeRef: null,
    });

    const updateCall = mockDb.user.update.mock.calls[0][0];
    expect(updateCall.data.creditsBalance).toEqual({ increment: 10 });
  });

  it("persists stripeSubscriptionId on the Subscription row", async () => {
    mockDb.plan.findUnique.mockResolvedValue(SUBSCRIPTION_PLAN);
    mockDb.user.findUnique.mockResolvedValue(BASE_USER);
    mockDb.transaction.findUnique.mockResolvedValue(null);
    mockDb.transaction.create.mockResolvedValue({ id: "tx-1" });
    mockDb.user.update.mockResolvedValue({ ...BASE_USER, creditsBalance: 15 });
    mockDb.subscription.create.mockResolvedValue({ id: "sub-1" });

    await grantPlanPurchase({
      userId: BASE_USER.id,
      planId: SUBSCRIPTION_PLAN.id,
      paidCents: 9900,
      stripeRef: null,
      stripeSubscriptionId: "sub_stripe_abc123",
    });

    const subCreate = mockDb.subscription.create.mock.calls[0][0];
    expect(subCreate.data.stripeSubscriptionId).toBe("sub_stripe_abc123");
    expect(subCreate.data.userId).toBe(BASE_USER.id);
  });

  it("stores null stripeSubscriptionId when not provided", async () => {
    mockDb.plan.findUnique.mockResolvedValue(SUBSCRIPTION_PLAN);
    mockDb.user.findUnique.mockResolvedValue(BASE_USER);
    mockDb.transaction.findUnique.mockResolvedValue(null);
    mockDb.transaction.create.mockResolvedValue({ id: "tx-1" });
    mockDb.user.update.mockResolvedValue({ ...BASE_USER, creditsBalance: 15 });
    mockDb.subscription.create.mockResolvedValue({ id: "sub-1" });

    await grantPlanPurchase({
      userId: BASE_USER.id,
      planId: SUBSCRIPTION_PLAN.id,
      paidCents: 9900,
      stripeRef: null,
    });

    const subCreate = mockDb.subscription.create.mock.calls[0][0];
    expect(subCreate.data.stripeSubscriptionId).toBeNull();
  });
});

describe("grantPlanPurchase — idempotency (stripeRef already PAID)", () => {
  it("returns ok:true without double-crediting when PAID transaction already exists", async () => {
    mockDb.plan.findUnique.mockResolvedValue(CREDIT_PACK_PLAN);
    mockDb.user.findUnique.mockResolvedValue(BASE_USER);
    // Simulate the pre-check: a PAID tx already exists for this stripeRef
    mockDb.transaction.findUnique.mockResolvedValue({
      id: "tx-existing",
      paymentStatus: "PAID",
      stripeRef: "cs_test_123",
    });

    const result = await grantPlanPurchase({
      userId: BASE_USER.id,
      planId: CREDIT_PACK_PLAN.id,
      paidCents: 5000,
      stripeRef: "cs_test_123",
    });

    expect(result.ok).toBe(true);
    // The $transaction callback should not have been entered at all
    // (early return before $transaction call)
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });

  it("uses updateMany atomic claim when stripeRef present and not yet PAID", async () => {
    mockDb.plan.findUnique.mockResolvedValue(CREDIT_PACK_PLAN);
    mockDb.user.findUnique.mockResolvedValue(BASE_USER);
    mockDb.transaction.findUnique.mockResolvedValue(null); // pre-check: not yet PAID
    // Atomic claim succeeds (1 row updated)
    mockDb.transaction.updateMany.mockResolvedValue({ count: 1 });
    mockDb.user.update.mockResolvedValue({ ...BASE_USER, creditsBalance: 10 });

    const result = await grantPlanPurchase({
      userId: BASE_USER.id,
      planId: CREDIT_PACK_PLAN.id,
      paidCents: 5000,
      stripeRef: "cs_test_new",
    });

    expect(result.ok).toBe(true);
    // updateMany (not create) must be used for the atomic PENDING→PAID flip
    expect(mockDb.transaction.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          stripeRef: "cs_test_new",
          paymentStatus: { not: "PAID" },
        }),
        data: expect.objectContaining({ paymentStatus: "PAID" }),
      })
    );
    // user balance must be incremented
    expect(mockDb.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { creditsBalance: { increment: 5 } },
      })
    );
  });

  it("returns ok:true (no-op) when concurrent delivery already claimed the row", async () => {
    mockDb.plan.findUnique.mockResolvedValue(CREDIT_PACK_PLAN);
    mockDb.user.findUnique.mockResolvedValue(BASE_USER);
    mockDb.transaction.findUnique.mockResolvedValue(null);
    // Atomic claim returns 0 (another delivery already flipped to PAID)
    mockDb.transaction.updateMany.mockResolvedValue({ count: 0 });

    const result = await grantPlanPurchase({
      userId: BASE_USER.id,
      planId: CREDIT_PACK_PLAN.id,
      paidCents: 5000,
      stripeRef: "cs_test_race",
    });

    expect(result.ok).toBe(true);
    // Balance must NOT be touched
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });
});

describe("startCheckout — introOnly plan restriction", () => {
  it("blocks purchase when user already has a prior PAID transaction", async () => {
    mockDb.user.findUnique.mockResolvedValue(BASE_USER);
    mockDb.plan.findUnique.mockResolvedValue(INTRO_PLAN);
    mockDb.transaction.count.mockResolvedValue(1); // has a prior purchase

    const result = await startCheckout({
      userId: BASE_USER.id,
      planId: INTRO_PLAN.id,
      successUrl: "http://localhost/success",
      cancelUrl: "http://localhost/cancel",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/nouveaux membres/i);
    }
  });

  it("allows purchase when user has no prior transactions", async () => {
    mockDb.user.findUnique.mockResolvedValue(BASE_USER);
    mockDb.plan.findUnique.mockResolvedValue(INTRO_PLAN);
    mockDb.transaction.count.mockResolvedValue(0); // no prior purchases

    // grantPlanPurchase internals (called by startCheckout in free/dev mode)
    mockDb.plan.findUnique.mockResolvedValue(INTRO_PLAN); // called again inside grant
    mockDb.user.findUnique.mockResolvedValue(BASE_USER);   // called again inside grant
    mockDb.transaction.findUnique.mockResolvedValue(null);
    mockDb.transaction.create.mockResolvedValue({ id: "tx-new" });
    mockDb.user.update.mockResolvedValue({ ...BASE_USER, creditsBalance: 10 });

    const result = await startCheckout({
      userId: BASE_USER.id,
      planId: INTRO_PLAN.id,
      successUrl: "http://localhost/success",
      cancelUrl: "http://localhost/cancel",
    });

    expect(result.ok).toBe(true);
  });
});

describe("startCheckout — maxPerUser quota", () => {
  const LIMITED_PLAN = {
    ...CREDIT_PACK_PLAN,
    id: "plan-limited",
    maxPerUser: 2,
  };

  it("blocks when quota is already reached", async () => {
    mockDb.user.findUnique.mockResolvedValue(BASE_USER);
    mockDb.plan.findUnique.mockResolvedValue(LIMITED_PLAN);
    mockDb.transaction.count.mockResolvedValue(2); // at maxPerUser limit

    const result = await startCheckout({
      userId: BASE_USER.id,
      planId: LIMITED_PLAN.id,
      successUrl: "http://localhost/success",
      cancelUrl: "http://localhost/cancel",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/quota/i);
    }
  });

  it("allows purchase when count is below maxPerUser", async () => {
    mockDb.user.findUnique.mockResolvedValue(BASE_USER);
    mockDb.plan.findUnique.mockResolvedValue(LIMITED_PLAN);
    mockDb.transaction.count.mockResolvedValue(1); // still under limit

    // Wire up the grant path (Stripe disabled, free mode)
    mockDb.plan.findUnique.mockResolvedValue(LIMITED_PLAN);
    mockDb.user.findUnique.mockResolvedValue(BASE_USER);
    mockDb.transaction.findUnique.mockResolvedValue(null);
    mockDb.transaction.create.mockResolvedValue({ id: "tx-new" });
    mockDb.user.update.mockResolvedValue({ ...BASE_USER, creditsBalance: 10 });

    const result = await startCheckout({
      userId: BASE_USER.id,
      planId: LIMITED_PLAN.id,
      successUrl: "http://localhost/success",
      cancelUrl: "http://localhost/cancel",
    });

    expect(result.ok).toBe(true);
  });
});

describe("startCheckout — error cases", () => {
  it("returns error when user not found", async () => {
    mockDb.user.findUnique.mockResolvedValue(null);

    const result = await startCheckout({
      userId: "nonexistent",
      planId: CREDIT_PACK_PLAN.id,
      successUrl: "http://localhost/success",
      cancelUrl: "http://localhost/cancel",
    });

    expect(result.ok).toBe(false);
  });

  it("returns error when plan not found", async () => {
    mockDb.user.findUnique.mockResolvedValue(BASE_USER);
    mockDb.plan.findUnique.mockResolvedValue(null);

    const result = await startCheckout({
      userId: BASE_USER.id,
      planId: "nonexistent-plan",
      successUrl: "http://localhost/success",
      cancelUrl: "http://localhost/cancel",
    });

    expect(result.ok).toBe(false);
  });

  it("returns error when plan is inactive", async () => {
    mockDb.user.findUnique.mockResolvedValue(BASE_USER);
    mockDb.plan.findUnique.mockResolvedValue({ ...CREDIT_PACK_PLAN, active: false });

    const result = await startCheckout({
      userId: BASE_USER.id,
      planId: CREDIT_PACK_PLAN.id,
      successUrl: "http://localhost/success",
      cancelUrl: "http://localhost/cancel",
    });

    expect(result.ok).toBe(false);
  });
});
