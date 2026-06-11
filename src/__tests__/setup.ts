// Global test setup
// Silence console output during tests unless debugging
import { vi } from "vitest";

// Provide required env vars
process.env.AUTH_SECRET = "test-secret-at-least-32-characters-long!!";
process.env.CRON_SECRET = "test-cron-secret";

// Prevent settings cache from leaking between tests
vi.mock("@/lib/settings", () => ({
  getSettings: vi.fn().mockResolvedValue({
    studioName: "Ilannatek",
    cancellationCutoffMin: 120,
    lateCancelFee: 1,
    noShowFee: 2,
    bookingWindowDays: 14,
    welcomeCredits: 0,
    emailFrom: "noreply@ilannatek.fr",
    stripePublishableKey: null,
  }),
  invalidateSettings: vi.fn(),
  updateSettings: vi.fn(),
}));

// Mock audit to be a no-op in all tests
vi.mock("@/lib/audit", () => ({
  audit: vi.fn().mockResolvedValue(undefined),
}));

// Mock email sending in all tests
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  retryOutboxEmail: vi.fn().mockResolvedValue(undefined),
  emailTemplates: new Proxy(
    {},
    {
      get: () =>
        () => ({
          subject: "test subject",
          html: "<p>test</p>",
        }),
    }
  ),
}));
