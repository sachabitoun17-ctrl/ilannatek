/**
 * Manual Prisma mock factory.
 *
 * Returns a deeply-nested object that mirrors the subset of PrismaClient we
 * use, with every method replaced by a vi.fn() that you can override per-test
 * with .mockResolvedValue() / .mockRejectedValue() etc.
 *
 * The returned object is also wired into the "@/lib/db" module mock so that
 * any module that does `import { db } from "@/lib/db"` gets this mock.
 */

import { vi } from "vitest";

// Type-only import so we don't need an actual DB connection at test time.
// We cast the mock to `any` when passing to the module factory.

function makeTransactionFn() {
  // Default implementation: execute the callback with the same mock client
  const txFn = vi.fn();
  return txFn;
}

export function createPrismaMock() {
  const mockDb = {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      upsert: vi.fn(),
    },
    plan: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    transaction: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    booking: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    waitlistToken: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    settings: {
      upsert: vi.fn(),
    },
    emailOutbox: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: makeTransactionFn(),
    $queryRaw: vi.fn(),
  };

  // By default, $transaction executes the callback with the same mock db
  mockDb.$transaction.mockImplementation(async (cb: (tx: typeof mockDb) => Promise<unknown>) => {
    return cb(mockDb);
  });

  return mockDb;
}

export type PrismaMock = ReturnType<typeof createPrismaMock>;
