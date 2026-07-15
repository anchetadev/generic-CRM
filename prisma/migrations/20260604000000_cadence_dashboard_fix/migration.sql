-- Migration: cadence_dashboard_fix
-- Bridges leads to the cadence engine and adds daily stats support.
--
-- Changes:
--   1. Create TaskStatus enum (PENDING, IN_PROGRESS, COMPLETED, SKIPPED)
--   2. Add contact_id + follow_up_at columns to leads
--   3. Add lead_id + status columns to cadence_tasks
--   4. Add indexes for dashboard queries

-- 1. TaskStatus enum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- 2. leads: contact_id FK + follow_up_at
ALTER TABLE "leads" ADD COLUMN "contact_id" TEXT;
ALTER TABLE "leads" ADD COLUMN "follow_up_at" TIMESTAMPTZ;

ALTER TABLE "leads"
  ADD CONSTRAINT "leads_contact_id_fkey"
  FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL;

CREATE INDEX "leads_contact_id_idx" ON "leads"("contact_id");
CREATE INDEX "leads_follow_up_at_idx" ON "leads"("follow_up_at");

-- 3. cadence_tasks: lead_id FK + status
ALTER TABLE "cadence_tasks" ADD COLUMN "lead_id" TEXT;
ALTER TABLE "cadence_tasks" ADD COLUMN "status" "TaskStatus" NOT NULL DEFAULT 'PENDING';

ALTER TABLE "cadence_tasks"
  ADD CONSTRAINT "cadence_tasks_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL;

CREATE INDEX "cadence_tasks_lead_id_idx" ON "cadence_tasks"("lead_id");
CREATE INDEX "cadence_tasks_status_due_at_idx" ON "cadence_tasks"("status", "due_at");
