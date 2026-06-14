-- ============================================================================
-- ILANNATEK — RATTRAPAGE COMPLET ET DÉFINITIF du schéma
-- À coller dans : console.neon.tech → votre projet → SQL Editor → Run
-- 100% idempotent : exécutable plusieurs fois sans risque.
-- Couvre TOUTES les tables et TOUTES les colonnes du schema.prisma.
-- ============================================================================

-- ─── User ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'USER',
  "creditsBalance" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "phone"                TEXT,
  ADD COLUMN IF NOT EXISTS "instructorBio"        TEXT,
  ADD COLUMN IF NOT EXISTS "instructorPhoto"      TEXT,
  ADD COLUMN IF NOT EXISTS "emailVerifiedAt"      TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sessionVersion"       INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "stripeCustomerId"     TEXT,
  ADD COLUMN IF NOT EXISTS "active"               BOOLEAN      NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "banned"               BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "creditsFrozenUntil"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "attendeeVisible"      BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "emailOptIn"           BOOLEAN      NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "lowCreditsNotifiedAt" TIMESTAMP(3);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'User_email_key') THEN
    CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'User_stripeCustomerId_key') THEN
    CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
  END IF;
END $$;

-- ─── Location ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Location" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Location"
  ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris';

-- ─── ClassType ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ClassType" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "durationMin" INTEGER NOT NULL DEFAULT 60,
  "creditCost" INTEGER NOT NULL DEFAULT 1,
  "color" TEXT NOT NULL DEFAULT '#ec4899',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClassType_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ClassType"
  ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

-- ─── RecurringRule ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "RecurringRule" (
  "id" TEXT NOT NULL,
  "classTypeId" TEXT NOT NULL,
  "instructorId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "daysOfWeek" TEXT NOT NULL,
  "startTimeMin" INTEGER NOT NULL,
  "capacity" INTEGER NOT NULL DEFAULT 15,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecurringRule_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "RecurringRule"
  ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);

-- ─── Session ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT NOT NULL,
  "classTypeId" TEXT NOT NULL,
  "instructorId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "startTime" TIMESTAMP(3) NOT NULL,
  "endTime" TIMESTAMP(3) NOT NULL,
  "capacity" INTEGER NOT NULL DEFAULT 15,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Session"
  ADD COLUMN IF NOT EXISTS "cancellationCutoffMin" INTEGER,
  ADD COLUMN IF NOT EXISTS "notes"                 TEXT,
  ADD COLUMN IF NOT EXISTS "recurringRuleId"       TEXT;
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

-- ─── Booking ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Booking" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
  "creditsUsed" INTEGER NOT NULL DEFAULT 0,
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "waitlistPos"            INTEGER,
  ADD COLUMN IF NOT EXISTS "feeApplied"             INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "promotedFromWaitlistAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reminder2hSentAt"       TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reminderSentAt"         TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "postClassSentAt"        TIMESTAMP(3);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Booking_sessionId_userId_key') THEN
    CREATE UNIQUE INDEX "Booking_sessionId_userId_key" ON "Booking"("sessionId", "userId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Booking_userId_idx') THEN
    CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Booking_status_idx') THEN
    CREATE INDEX "Booking_status_idx" ON "Booking"("status");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Booking_sessionId_status_idx') THEN
    CREATE INDEX "Booking_sessionId_status_idx" ON "Booking"("sessionId", "status");
  END IF;
END $$;

-- ─── CheckIn ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CheckIn" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'CheckIn_sessionId_userId_key') THEN
    CREATE UNIQUE INDEX "CheckIn_sessionId_userId_key" ON "CheckIn"("sessionId", "userId");
  END IF;
END $$;

-- ─── Plan ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Plan" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL,
  "priceCents" INTEGER NOT NULL,
  "creditsAmount" INTEGER,
  "intervalDays" INTEGER,
  "creditsPerCycle" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Plan"
  ADD COLUMN IF NOT EXISTS "stripePriceId" TEXT,
  ADD COLUMN IF NOT EXISTS "introOnly"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "maxPerUser"    INTEGER;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Plan_stripePriceId_key') THEN
    CREATE UNIQUE INDEX "Plan_stripePriceId_key" ON "Plan"("stripePriceId");
  END IF;
END $$;

-- ─── Subscription ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Subscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endDate" TIMESTAMP(3) NOT NULL,
  "autoRenew" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Subscription"
  ADD COLUMN IF NOT EXISTS "frozenAt"             TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "resumedAt"            TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;
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

-- ─── PromoCode ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PromoCode" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "discountType" TEXT NOT NULL,
  "discountValue" INTEGER NOT NULL,
  "maxUses" INTEGER,
  "uses" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "PromoCode"
  ADD COLUMN IF NOT EXISTS "applicablePlanIds" TEXT,
  ADD COLUMN IF NOT EXISTS "active"            BOOLEAN NOT NULL DEFAULT true;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'PromoCode_code_key') THEN
    CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");
  END IF;
END $$;

-- ─── PromoRedemption ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PromoRedemption" (
  "id" TEXT NOT NULL,
  "codeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "transactionId" TEXT,
  "appliedAmount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PromoRedemption_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'PromoRedemption_codeId_userId_key') THEN
    CREATE UNIQUE INDEX "PromoRedemption_codeId_userId_key" ON "PromoRedemption"("codeId", "userId");
  END IF;
END $$;

-- ─── Transaction ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Transaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL DEFAULT 0,
  "creditsDelta" INTEGER NOT NULL DEFAULT 0,
  "description" TEXT,
  "paymentStatus" TEXT NOT NULL DEFAULT 'FREE',
  "stripeRef" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS "planId"         TEXT,
  ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
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

-- ─── AuditLog ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entity" TEXT,
  "entityId" TEXT,
  "metadata" TEXT,
  "ip" TEXT,
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

-- ─── PasswordResetToken ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'PasswordResetToken_token_key') THEN
    CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'PasswordResetToken_token_idx') THEN
    CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");
  END IF;
END $$;

-- ─── LoginAttempt ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "LoginAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "email" TEXT NOT NULL,
  "ip" TEXT,
  "success" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'LoginAttempt_email_createdAt_idx') THEN
    CREATE INDEX "LoginAttempt_email_createdAt_idx" ON "LoginAttempt"("email", "createdAt");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'LoginAttempt_ip_createdAt_idx') THEN
    CREATE INDEX "LoginAttempt_ip_createdAt_idx" ON "LoginAttempt"("ip", "createdAt");
  END IF;
END $$;

-- ─── WaitlistToken ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "WaitlistToken" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WaitlistToken_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "WaitlistToken"
  ADD COLUMN IF NOT EXISTS "cascadedAt" TIMESTAMP(3);
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
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'WaitlistToken_expiresAt_usedAt_cascadedAt_idx') THEN
    CREATE INDEX "WaitlistToken_expiresAt_usedAt_cascadedAt_idx" ON "WaitlistToken"("expiresAt", "usedAt", "cascadedAt");
  END IF;
END $$;

-- ─── LoginOtp ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "LoginOtp" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginOtp_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'LoginOtp_userId_createdAt_idx') THEN
    CREATE INDEX "LoginOtp_userId_createdAt_idx" ON "LoginOtp"("userId", "createdAt");
  END IF;
END $$;

-- ─── EmailOutbox ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EmailOutbox" (
  "id" TEXT NOT NULL,
  "to" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "html" TEXT NOT NULL,
  "text" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "nextRetryAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailOutbox_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'EmailOutbox_status_nextRetryAt_idx') THEN
    CREATE INDEX "EmailOutbox_status_nextRetryAt_idx" ON "EmailOutbox"("status", "nextRetryAt");
  END IF;
END $$;

-- ─── FriendInvite ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "FriendInvite" (
  "id" TEXT NOT NULL,
  "fromUserId" TEXT NOT NULL,
  "toEmail" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "creditsGranted" INTEGER NOT NULL DEFAULT 1,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

-- ─── SubRequest ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SubRequest" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "subId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

-- ─── Settings ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Settings" (
  "id" TEXT NOT NULL DEFAULT 'singleton',
  "studioName" TEXT NOT NULL DEFAULT 'Ilannatek',
  "cancellationCutoffMin" INTEGER NOT NULL DEFAULT 120,
  "lateCancelFee" INTEGER NOT NULL DEFAULT 1,
  "noShowFee" INTEGER NOT NULL DEFAULT 2,
  "bookingWindowDays" INTEGER NOT NULL DEFAULT 14,
  "welcomeCredits" INTEGER NOT NULL DEFAULT 0,
  "emailFrom" TEXT NOT NULL DEFAULT 'noreply@ilannatek.fr',
  "stripePublishableKey" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);
INSERT INTO "Settings" ("id") VALUES ('singleton') ON CONFLICT DO NOTHING;

-- ─── Clés étrangères (toutes idempotentes) ──────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'LoginAttempt_userId_fkey') THEN
    ALTER TABLE "LoginAttempt" ADD CONSTRAINT "LoginAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'RecurringRule_classTypeId_fkey') THEN
    ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_classTypeId_fkey" FOREIGN KEY ("classTypeId") REFERENCES "ClassType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Session_classTypeId_fkey') THEN
    ALTER TABLE "Session" ADD CONSTRAINT "Session_classTypeId_fkey" FOREIGN KEY ("classTypeId") REFERENCES "ClassType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Session_instructorId_fkey') THEN
    ALTER TABLE "Session" ADD CONSTRAINT "Session_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Session_locationId_fkey') THEN
    ALTER TABLE "Session" ADD CONSTRAINT "Session_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Booking_sessionId_fkey') THEN
    ALTER TABLE "Booking" ADD CONSTRAINT "Booking_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Booking_userId_fkey') THEN
    ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CheckIn_sessionId_fkey') THEN
    ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CheckIn_userId_fkey') THEN
    ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Subscription_userId_fkey') THEN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Subscription_planId_fkey') THEN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PromoRedemption_codeId_fkey') THEN
    ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "PromoCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Transaction_userId_fkey') THEN
    ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Transaction_planId_fkey') THEN
    ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'AuditLog_actorId_fkey') THEN
    ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PasswordResetToken_userId_fkey') THEN
    ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'WaitlistToken_bookingId_fkey') THEN
    ALTER TABLE "WaitlistToken" ADD CONSTRAINT "WaitlistToken_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'LoginOtp_userId_fkey') THEN
    ALTER TABLE "LoginOtp" ADD CONSTRAINT "LoginOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'FriendInvite_fromUserId_fkey') THEN
    ALTER TABLE "FriendInvite" ADD CONSTRAINT "FriendInvite_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
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

-- ─── Account (multi-tenant) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Account" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "plan" TEXT NOT NULL DEFAULT 'STARTER',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "contactEmail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Account_slug_key') THEN
    CREATE UNIQUE INDEX "Account_slug_key" ON "Account"("slug");
  END IF;
END $$;

-- ─── Studio (multi-tenant) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Studio" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "city" TEXT,
  "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Studio_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Studio_slug_key') THEN
    CREATE UNIQUE INDEX "Studio_slug_key" ON "Studio"("slug");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Studio_accountId_idx') THEN
    CREATE INDEX "Studio_accountId_idx" ON "Studio"("accountId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Studio_accountId_fkey') THEN
    ALTER TABLE "Studio" ADD CONSTRAINT "Studio_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Seed le premier compte + studio (Ilannatek) si absent.
INSERT INTO "Account" ("id", "name", "slug", "plan", "status", "contactEmail")
  VALUES ('acc_ilannatek', 'Ilannatek', 'ilannatek', 'PRO', 'ACTIVE', 'contact@ilannatek.fr')
  ON CONFLICT DO NOTHING;
INSERT INTO "Studio" ("id", "accountId", "name", "slug", "city", "timezone", "status")
  VALUES ('stu_ilannatek', 'acc_ilannatek', 'Ilannatek · Paris', 'ilannatek-paris', 'Paris', 'Europe/Paris', 'ACTIVE')
  ON CONFLICT DO NOTHING;

-- ─── Scoping : rattacher chaque membre à son studio ──────────────────────────
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "studioId" TEXT;
-- Tous les utilisateurs existants (sauf superadmin) appartiennent au studio Ilannatek.
UPDATE "User" SET "studioId" = 'stu_ilannatek'
  WHERE "studioId" IS NULL AND "role" <> 'SUPERADMIN';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'User_studioId_idx') THEN
    CREATE INDEX "User_studioId_idx" ON "User"("studioId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'User_studioId_fkey') THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ✓ Terminé. Le schéma correspond maintenant exactement à Prisma.
