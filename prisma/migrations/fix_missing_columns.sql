-- ============================================================
-- Rattrapage de migration COMPLET — toutes tables / colonnes
-- Coller dans : console.neon.tech → SQL Editor
-- Idempotent (IF NOT EXISTS partout)
-- ============================================================

-- ── User ─────────────────────────────────────────────────────
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "banned"                BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "creditsFrozenUntil"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "attendeeVisible"        BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "emailOptIn"             BOOLEAN      NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "lowCreditsNotifiedAt"   TIMESTAMP(3);

-- ── Booking ──────────────────────────────────────────────────
ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "waitlistPos"             INTEGER,
  ADD COLUMN IF NOT EXISTS "feeApplied"              INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "promotedFromWaitlistAt"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reminder2hSentAt"        TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reminderSentAt"          TIMESTAMP(3);

-- ── Plan ─────────────────────────────────────────────────────
ALTER TABLE "Plan"
  ADD COLUMN IF NOT EXISTS "stripePriceId"   TEXT,
  ADD COLUMN IF NOT EXISTS "introOnly"        BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "maxPerUser"       INTEGER;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Plan_stripePriceId_key') THEN
    CREATE UNIQUE INDEX "Plan_stripePriceId_key" ON "Plan"("stripePriceId");
  END IF;
END $$;

-- ── Subscription ─────────────────────────────────────────────
ALTER TABLE "Subscription"
  ADD COLUMN IF NOT EXISTS "frozenAt"               TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "resumedAt"              TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "stripeSubscriptionId"   TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Subscription_stripeSubscriptionId_key') THEN
    CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Subscription_userId_status_idx') THEN
    CREATE INDEX "Subscription_userId_status_idx" ON "Subscription"("userId", "status");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Subscription_endDate_idx') THEN
    CREATE INDEX "Subscription_endDate_idx" ON "Subscription"("endDate");
  END IF;
END $$;

-- ── Transaction ───────────────────────────────────────────────
ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS "planId"           TEXT,
  ADD COLUMN IF NOT EXISTS "idempotencyKey"   TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Transaction_stripeRef_key') THEN
    CREATE UNIQUE INDEX "Transaction_stripeRef_key" ON "Transaction"("stripeRef");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Transaction_idempotencyKey_key') THEN
    CREATE UNIQUE INDEX "Transaction_idempotencyKey_key" ON "Transaction"("idempotencyKey");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Transaction_userId_createdAt_idx') THEN
    CREATE INDEX "Transaction_userId_createdAt_idx" ON "Transaction"("userId", "createdAt");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Transaction_type_createdAt_idx') THEN
    CREATE INDEX "Transaction_type_createdAt_idx" ON "Transaction"("type", "createdAt");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Transaction_planId_fkey'
  ) THEN
    ALTER TABLE "Transaction"
      ADD CONSTRAINT "Transaction_planId_fkey"
      FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ── Session ──────────────────────────────────────────────────
ALTER TABLE "Session"
  ADD COLUMN IF NOT EXISTS "cancellationCutoffMin"  INTEGER,
  ADD COLUMN IF NOT EXISTS "notes"                  TEXT,
  ADD COLUMN IF NOT EXISTS "recurringRuleId"         TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Session_startTime_idx') THEN
    CREATE INDEX "Session_startTime_idx" ON "Session"("startTime");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Session_instructorId_startTime_idx') THEN
    CREATE INDEX "Session_instructorId_startTime_idx" ON "Session"("instructorId", "startTime");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Session_locationId_startTime_idx') THEN
    CREATE INDEX "Session_locationId_startTime_idx" ON "Session"("locationId", "startTime");
  END IF;
END $$;

-- ── RecurringRule ────────────────────────────────────────────
ALTER TABLE "RecurringRule"
  ADD COLUMN IF NOT EXISTS "endDate"  TIMESTAMP(3);

-- ── ClassType ────────────────────────────────────────────────
ALTER TABLE "ClassType"
  ADD COLUMN IF NOT EXISTS "active"  BOOLEAN NOT NULL DEFAULT true;

-- ── PromoCode ────────────────────────────────────────────────
ALTER TABLE "PromoCode"
  ADD COLUMN IF NOT EXISTS "applicablePlanIds"  TEXT,
  ADD COLUMN IF NOT EXISTS "active"              BOOLEAN NOT NULL DEFAULT true;

-- ── AuditLog ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id"        TEXT NOT NULL,
    "actorId"   TEXT,
    "action"    TEXT NOT NULL,
    "entity"    TEXT,
    "entityId"  TEXT,
    "metadata"  TEXT,
    "ip"        TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'AuditLog_actorId_createdAt_idx') THEN
    CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'AuditLog_action_createdAt_idx') THEN
    CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'AuditLog_actorId_fkey') THEN
    ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ── WaitlistToken ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "WaitlistToken" (
    "id"        TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "token"     TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt"    TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WaitlistToken_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'WaitlistToken_token_key') THEN
    CREATE UNIQUE INDEX "WaitlistToken_token_key" ON "WaitlistToken"("token");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'WaitlistToken_token_idx') THEN
    CREATE INDEX "WaitlistToken_token_idx" ON "WaitlistToken"("token");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'WaitlistToken_bookingId_idx') THEN
    CREATE INDEX "WaitlistToken_bookingId_idx" ON "WaitlistToken"("bookingId");
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'WaitlistToken_bookingId_fkey') THEN
    ALTER TABLE "WaitlistToken" ADD CONSTRAINT "WaitlistToken_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── LoginOtp ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "LoginOtp" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "codeHash"  TEXT NOT NULL,
    "attempts"  INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt"    TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginOtp_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'LoginOtp_userId_createdAt_idx') THEN
    CREATE INDEX "LoginOtp_userId_createdAt_idx" ON "LoginOtp"("userId", "createdAt");
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'LoginOtp_userId_fkey') THEN
    ALTER TABLE "LoginOtp" ADD CONSTRAINT "LoginOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── EmailOutbox ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EmailOutbox" (
    "id"          TEXT NOT NULL,
    "to"          TEXT NOT NULL,
    "subject"     TEXT NOT NULL,
    "html"        TEXT NOT NULL,
    "text"        TEXT,
    "status"      TEXT NOT NULL DEFAULT 'PENDING',
    "attempts"    INTEGER NOT NULL DEFAULT 0,
    "lastError"   TEXT,
    "nextRetryAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt"      TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailOutbox_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'EmailOutbox_status_nextRetryAt_idx') THEN
    CREATE INDEX "EmailOutbox_status_nextRetryAt_idx" ON "EmailOutbox"("status", "nextRetryAt");
  END IF;
END $$;

-- ── FriendInvite ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "FriendInvite" (
    "id"             TEXT NOT NULL,
    "fromUserId"     TEXT NOT NULL,
    "toEmail"        TEXT NOT NULL,
    "token"          TEXT NOT NULL,
    "creditsGranted" INTEGER NOT NULL DEFAULT 1,
    "expiresAt"      TIMESTAMP(3) NOT NULL,
    "usedAt"         TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FriendInvite_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'FriendInvite_token_key') THEN
    CREATE UNIQUE INDEX "FriendInvite_token_key" ON "FriendInvite"("token");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'FriendInvite_fromUserId_idx') THEN
    CREATE INDEX "FriendInvite_fromUserId_idx" ON "FriendInvite"("fromUserId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'FriendInvite_token_idx') THEN
    CREATE INDEX "FriendInvite_token_idx" ON "FriendInvite"("token");
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'FriendInvite_fromUserId_fkey') THEN
    ALTER TABLE "FriendInvite" ADD CONSTRAINT "FriendInvite_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ── SubRequest ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SubRequest" (
    "id"          TEXT NOT NULL,
    "sessionId"   TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "reason"      TEXT,
    "status"      TEXT NOT NULL DEFAULT 'OPEN',
    "subId"       TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubRequest_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'SubRequest_sessionId_key') THEN
    CREATE UNIQUE INDEX "SubRequest_sessionId_key" ON "SubRequest"("sessionId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'SubRequest_status_createdAt_idx') THEN
    CREATE INDEX "SubRequest_status_createdAt_idx" ON "SubRequest"("status", "createdAt");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'SubRequest_requesterId_idx') THEN
    CREATE INDEX "SubRequest_requesterId_idx" ON "SubRequest"("requesterId");
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'SubRequest_sessionId_fkey') THEN
    ALTER TABLE "SubRequest" ADD CONSTRAINT "SubRequest_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'SubRequest_requesterId_fkey') THEN
    ALTER TABLE "SubRequest" ADD CONSTRAINT "SubRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'SubRequest_subId_fkey') THEN
    ALTER TABLE "SubRequest" ADD CONSTRAINT "SubRequest_subId_fkey" FOREIGN KEY ("subId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ── Settings ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Settings" (
    "id"                    TEXT    NOT NULL DEFAULT 'singleton',
    "studioName"            TEXT    NOT NULL DEFAULT 'Ilannatek',
    "cancellationCutoffMin" INTEGER NOT NULL DEFAULT 120,
    "lateCancelFee"         INTEGER NOT NULL DEFAULT 1,
    "noShowFee"             INTEGER NOT NULL DEFAULT 2,
    "bookingWindowDays"     INTEGER NOT NULL DEFAULT 14,
    "welcomeCredits"        INTEGER NOT NULL DEFAULT 0,
    "emailFrom"             TEXT    NOT NULL DEFAULT 'noreply@ilannatek.fr',
    "stripePublishableKey"  TEXT,
    "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);
INSERT INTO "Settings" ("id") VALUES ('singleton') ON CONFLICT DO NOTHING;

-- ── Fin ──────────────────────────────────────────────────────
