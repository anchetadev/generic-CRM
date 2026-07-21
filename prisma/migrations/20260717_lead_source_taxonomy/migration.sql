-- Migration: Lead Source Taxonomy
-- Replaces free-text `source` with structured `lead_source` + `lead_source_detail`

-- Create enums
CREATE TYPE "LeadSource" AS ENUM ('REFERRAL', 'INBOUND', 'OUTBOUND');
CREATE TYPE "LeadSourceDetail" AS ENUM (
  'WARN_TRIGGER',
  'LINKEDIN_ICP_MATCH',
  'REFERRAL_INTRODUCTION',
  'WORD_OF_MOUTH',
  'SILENT_REFERRAL',
  'EVENT',
  'WEBSITE_CONTENT',
  'OTHER'
);

-- Add new columns
ALTER TABLE "leads" ADD COLUMN "lead_source" "LeadSource";
ALTER TABLE "leads" ADD COLUMN "lead_source_detail" "LeadSourceDetail";

-- Retroactively tag existing leads based on free-text source
-- Best-effort mapping; unrecognized values stay NULL for manual cleanup
UPDATE "leads" SET
  "lead_source" = CASE
    WHEN LOWER("source") IN ('referral', 'word of mouth', 'introduction') THEN 'REFERRAL'::"LeadSource"
    WHEN LOWER("source") IN ('website', 'inbound', 'content', 'blog', 'seo') THEN 'INBOUND'::"LeadSource"
    WHEN LOWER("source") IN ('outbound', 'cold outreach', 'linkedin', 'prospecting') THEN 'OUTBOUND'::"LeadSource"
    ELSE NULL
  END,
  "lead_source_detail" = CASE
    WHEN LOWER("source") IN ('warn', 'warn trigger') THEN 'WARN_TRIGGER'::"LeadSourceDetail"
    WHEN LOWER("source") IN ('linkedin', 'linkedin icp', 'linkedin icp match') THEN 'LINKEDIN_ICP_MATCH'::"LeadSourceDetail"
    WHEN LOWER("source") IN ('referral', 'referral introduction', 'introduction') THEN 'REFERRAL_INTRODUCTION'::"LeadSourceDetail"
    WHEN LOWER("source") IN ('word of mouth', 'wom') THEN 'WORD_OF_MOUTH'::"LeadSourceDetail"
    WHEN LOWER("source") IN ('silent referral') THEN 'SILENT_REFERRAL'::"LeadSourceDetail"
    WHEN LOWER("source") IN ('event', 'conference', 'meetup') THEN 'EVENT'::"LeadSourceDetail"
    WHEN LOWER("source") IN ('website', 'content', 'blog', 'seo') THEN 'WEBSITE_CONTENT'::"LeadSourceDetail"
    WHEN "source" IS NOT NULL AND "source" != '' THEN 'OTHER'::"LeadSourceDetail"
    ELSE NULL
  END;

-- Drop old source column
ALTER TABLE "leads" DROP COLUMN "source";

-- Add index on lead_source
CREATE INDEX "leads_lead_source_idx" ON "leads"("lead_source");
