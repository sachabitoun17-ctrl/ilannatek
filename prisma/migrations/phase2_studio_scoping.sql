-- ============================================================================
-- Phase 2 — Studio data scoping
-- Run once in Neon SQL Editor AFTER fix_missing_columns.sql
-- All existing rows are backfilled to stu_ilannatek (the first studio).
-- ============================================================================

-- ─── Session ─────────────────────────────────────────────────────────────────
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "studioId" TEXT;
UPDATE "Session" SET "studioId" = 'stu_ilannatek' WHERE "studioId" IS NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Session_studioId_idx') THEN
    CREATE INDEX "Session_studioId_idx" ON "Session"("studioId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Session_studioId_startTime_idx') THEN
    CREATE INDEX "Session_studioId_startTime_idx" ON "Session"("studioId", "startTime");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Session_studioId_fkey') THEN
    ALTER TABLE "Session" ADD CONSTRAINT "Session_studioId_fkey"
      FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── Location ────────────────────────────────────────────────────────────────
ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "studioId" TEXT;
UPDATE "Location" SET "studioId" = 'stu_ilannatek' WHERE "studioId" IS NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Location_studioId_idx') THEN
    CREATE INDEX "Location_studioId_idx" ON "Location"("studioId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Location_studioId_fkey') THEN
    ALTER TABLE "Location" ADD CONSTRAINT "Location_studioId_fkey"
      FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── ClassType ───────────────────────────────────────────────────────────────
ALTER TABLE "ClassType" ADD COLUMN IF NOT EXISTS "studioId" TEXT;
UPDATE "ClassType" SET "studioId" = 'stu_ilannatek' WHERE "studioId" IS NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ClassType_studioId_idx') THEN
    CREATE INDEX "ClassType_studioId_idx" ON "ClassType"("studioId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ClassType_studioId_fkey') THEN
    ALTER TABLE "ClassType" ADD CONSTRAINT "ClassType_studioId_fkey"
      FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── RecurringRule ───────────────────────────────────────────────────────────
ALTER TABLE "RecurringRule" ADD COLUMN IF NOT EXISTS "studioId" TEXT;
UPDATE "RecurringRule" SET "studioId" = 'stu_ilannatek' WHERE "studioId" IS NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'RecurringRule_studioId_idx') THEN
    CREATE INDEX "RecurringRule_studioId_idx" ON "RecurringRule"("studioId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'RecurringRule_studioId_fkey') THEN
    ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_studioId_fkey"
      FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── Plan ────────────────────────────────────────────────────────────────────
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "studioId" TEXT;
UPDATE "Plan" SET "studioId" = 'stu_ilannatek' WHERE "studioId" IS NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Plan_studioId_idx') THEN
    CREATE INDEX "Plan_studioId_idx" ON "Plan"("studioId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Plan_studioId_fkey') THEN
    ALTER TABLE "Plan" ADD CONSTRAINT "Plan_studioId_fkey"
      FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── PromoCode ───────────────────────────────────────────────────────────────
ALTER TABLE "PromoCode" ADD COLUMN IF NOT EXISTS "studioId" TEXT;
UPDATE "PromoCode" SET "studioId" = 'stu_ilannatek' WHERE "studioId" IS NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'PromoCode_studioId_idx') THEN
    CREATE INDEX "PromoCode_studioId_idx" ON "PromoCode"("studioId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PromoCode_studioId_fkey') THEN
    ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_studioId_fkey"
      FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── Settings (add studioId, link singleton to ilannatek) ────────────────────
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "studioId" TEXT;
UPDATE "Settings" SET "studioId" = 'stu_ilannatek' WHERE "id" = 'singleton' AND "studioId" IS NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Settings_studioId_key') THEN
    CREATE UNIQUE INDEX "Settings_studioId_key" ON "Settings"("studioId") WHERE "studioId" IS NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Settings_studioId_fkey') THEN
    ALTER TABLE "Settings" ADD CONSTRAINT "Settings_studioId_fkey"
      FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
