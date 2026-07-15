-- Supabase Data API — Retroactive GRANT Migration
-- Timestamp: 20260527000001
--
-- Starting October 30, 2026, new projects (and new tables in existing
-- projects) will NOT be auto-exposed to the Data API via the "public"
-- schema default. Every table must receive explicit GRANTs.
--
-- This migration retroactively grants access for all tables created in
-- migrations 001–023, matching the existing RLS policy posture.
--
-- Grant pattern for every new table going forward:
--   GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.<name> TO authenticated;
--   GRANT SELECT ON TABLE public.<name> TO anon;
--   -- Omit anon entirely for tables containing secrets (OAuth tokens,
--   -- verification keys, etc.).
--
--   authenticated → full CRUD for logged-in users.
--                    RLS policies (already in place) enforce row-level access.
--   anon          → SELECT only, and only for tables the browser client needs.
--                    Omitted entirely for tables containing secrets.
--   service_role  → Inherits full access by default (superuser-like).
--                    No explicit GRANTs needed.
--
-- Sensitive tables in this project (NO anon access):
--   - inbox_connections       (OAuth access_token + refresh_token in plaintext)
--   - calendar_watch_channels (Google push verification tokens)
--   - outreach_runs           (cron-write-only; anon doesn't need the dashboard)
--
-- Functions: RLS helper functions (current_workspace_id, current_is_admin,
-- enroll_lead_in_cadence, etc.) are SECURITY DEFINER and inherit the
-- owner's permissions. No explicit GRANT EXECUTE needed.
--
-- auth schema: auth.users, auth.sessions, etc. are managed by Supabase
-- and are NOT included here.

-- ============================================================================
-- Migration 001 — Foundations (workspaces, profiles, pipeline_stages)
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.workspaces TO authenticated;
GRANT SELECT ON TABLE public.workspaces TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.profiles TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pipeline_stages TO authenticated;
GRANT SELECT ON TABLE public.pipeline_stages TO anon;

-- ============================================================================
-- Migration 002 — Leads + Companies
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.companies TO authenticated;
GRANT SELECT ON TABLE public.companies TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.leads TO authenticated;
GRANT SELECT ON TABLE public.leads TO anon;

-- ============================================================================
-- Migration 003 — Activity (notes, tasks, messages)
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notes TO authenticated;
GRANT SELECT ON TABLE public.notes TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tasks TO authenticated;
GRANT SELECT ON TABLE public.tasks TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.messages TO authenticated;
GRANT SELECT ON TABLE public.messages TO anon;

-- ============================================================================
-- Migration 004 — Cadences
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cadences TO authenticated;
GRANT SELECT ON TABLE public.cadences TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cadence_steps TO authenticated;
GRANT SELECT ON TABLE public.cadence_steps TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lead_cadence_enrollments TO authenticated;
GRANT SELECT ON TABLE public.lead_cadence_enrollments TO anon;

-- ============================================================================
-- Migration 006 — Triggers
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.triggers TO authenticated;
GRANT SELECT ON TABLE public.triggers TO anon;

-- ============================================================================
-- Migration 007 — Inbox Connections (SENSITIVE — NO anon)
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.inbox_connections TO authenticated;
-- NO anon grant: contains OAuth access_token + refresh_token in plaintext.
-- RLS already enforces per-user access (user_id = auth.uid()).

-- ============================================================================
-- Migration 013 — ICP Categories
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.icp_categories TO authenticated;
GRANT SELECT ON TABLE public.icp_categories TO anon;

-- ============================================================================
-- Migration 016 — Calendar
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.calendar_events TO authenticated;
GRANT SELECT ON TABLE public.calendar_events TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.calendar_watch_channels TO authenticated;
-- NO anon grant: contains Google push verification tokens (calendar_watch_channels.token).
-- RLS already enforces per-user access (user_id = auth.uid()).

-- ============================================================================
-- Migration 017 — Client Engagements
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.program_types TO authenticated;
GRANT SELECT ON TABLE public.program_types TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.client_engagements TO authenticated;
GRANT SELECT ON TABLE public.client_engagements TO anon;

-- ============================================================================
-- Migration 018 — Partners
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.partner_types TO authenticated;
GRANT SELECT ON TABLE public.partner_types TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.partner_stages TO authenticated;
GRANT SELECT ON TABLE public.partner_stages TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.partners TO authenticated;
GRANT SELECT ON TABLE public.partners TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.partner_assignments TO authenticated;
GRANT SELECT ON TABLE public.partner_assignments TO anon;

-- ============================================================================
-- Migration 020 — Company Contacts
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.company_contacts TO authenticated;
GRANT SELECT ON TABLE public.company_contacts TO anon;

-- ============================================================================
-- Migration 022 — Outreach Runs (cron-write-only, dashboard-read-only)
-- ============================================================================
GRANT SELECT ON TABLE public.outreach_runs TO authenticated;
-- NO anon grant: operational/cron data; not needed for unauthenticated flow.
-- NO INSERT/UPDATE/DELETE for authenticated: writes are cron-only via service_role.

-- ============================================================================
-- Migration 023 — Outreach Templates
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.outreach_templates TO authenticated;
GRANT SELECT ON TABLE public.outreach_templates TO anon;