-- Phase B: Cadence Engine — Schema Design
-- Cadences are multi-touch outreach sequences that generate scheduled tasks for reps.

-- A reusable multi-touch outreach sequence.
CREATE TABLE cadence_sequences (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,                          -- e.g. "7-Day Warm Intro"
    description TEXT,
    target_type TEXT NOT NULL DEFAULT 'contact',        -- 'contact' | 'lead'
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- An individual touchpoint within a cadence sequence.
CREATE TABLE cadence_steps (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id     UUID NOT NULL REFERENCES cadence_sequences(id) ON DELETE CASCADE,
    step_number     INT NOT NULL,
    channel         TEXT NOT NULL,                      -- 'email' | 'call' | 'sms' | 'linkedin' | 'manual'
    action_type     TEXT NOT NULL,                      -- 'send_message' | 'make_call' | 'send_sms' | 'manual_task'
    subject_template TEXT,                              -- email subject placeholder
    body_template   TEXT,                               -- message/call-script template with placeholders
    wait_duration_minutes INT NOT NULL DEFAULT 0,       -- delay from previous step (or from start for step 1)
    wait_type       TEXT NOT NULL DEFAULT 'calendar',   -- 'calendar' | 'business_hours'
    condition       JSONB,                              -- optional gate: {"field":"lead_score","op":">","value":50}
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (sequence_id, step_number)
);

-- A running instance of a cadence, linked to a specific contact and assigned rep.
CREATE TABLE cadence_executions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id         UUID NOT NULL REFERENCES cadence_sequences(id),
    contact_id          UUID NOT NULL,                  -- FK to contacts (Phase A)
    assigned_rep_id     UUID NOT NULL,                  -- FK to users/reps
    current_step_number INT NOT NULL DEFAULT 0,
    status              TEXT NOT NULL DEFAULT 'active', -- 'active' | 'paused' | 'completed' | 'cancelled'
    started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A concrete task generated from a cadence step for a rep to act on.
CREATE TABLE cadence_tasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id    UUID NOT NULL REFERENCES cadence_executions(id) ON DELETE CASCADE,
    step_id         UUID NOT NULL REFERENCES cadence_steps(id),
    contact_id      UUID NOT NULL,
    assigned_rep_id UUID NOT NULL,
    due_date        TIMESTAMPTZ NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',    -- 'pending' | 'in_progress' | 'completed' | 'skipped'
    completed_at    TIMESTAMPTZ,
    notes           TEXT,                               -- rep notes after completion
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX idx_cadence_steps_sequence    ON cadence_steps (sequence_id);
CREATE INDEX idx_cadence_executions_status ON cadence_executions (status) WHERE status = 'active';
CREATE INDEX idx_cadence_executions_rep    ON cadence_executions (assigned_rep_id);
CREATE INDEX idx_cadence_tasks_due         ON cadence_tasks (due_date) WHERE status NOT IN ('completed', 'skipped');
CREATE INDEX idx_cadence_tasks_status      ON cadence_tasks (status) WHERE status = 'pending';
CREATE INDEX idx_cadence_tasks_rep_due     ON cadence_tasks (assigned_rep_id, due_date)
    WHERE status NOT IN ('completed', 'skipped');

-- View: Overdue tasks — tasks past due_date, not completed/skipped.
CREATE VIEW cadence_overdue AS
SELECT ct.*,
       c.name AS contact_name,
       cs.name AS sequence_name,
       EXTRACT(EPOCH FROM (now() - ct.due_date)) / 3600 AS hours_overdue
FROM cadence_tasks ct
JOIN cadence_executions ce ON ce.id = ct.execution_id
JOIN cadence_sequences  cs ON cs.id = ce.sequence_id
JOIN contacts            c ON c.id = ct.contact_id
WHERE ct.status NOT IN ('completed', 'skipped')
  AND ct.due_date < now();

-- View: CEO daily summary (per-rep cadence stats).
CREATE VIEW ceo_daily_cadence AS
SELECT
    ce.assigned_rep_id,
    date_trunc('day', ce.started_at)::date AS day,
    COUNT(DISTINCT ce.id) FILTER (WHERE ce.status = 'active')   AS active_executions,
    COUNT(DISTINCT ce.id) FILTER (WHERE ce.status = 'completed') AS completed_executions,
    COUNT(*) FILTER (WHERE ct.status = 'completed' AND ct.completed_at::date = CURRENT_DATE)
        AS tasks_completed_today,
    COUNT(*) FILTER (WHERE ct.status NOT IN ('completed', 'skipped') AND ct.due_date < now())
        AS overdue_tasks
FROM cadence_executions ce
LEFT JOIN cadence_tasks ct ON ct.execution_id = ce.id
GROUP BY ce.assigned_rep_id, day;