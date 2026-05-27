# Cadence Schema — Design Notes

## Models

**Cadence** — A named outreach sequence (e.g. "Enterprise Cold Outreach", "Nurture — Trial Expiring").

**CadenceStep** — One action within a cadence. Steps execute sequentially; `delayMinutes` is relative to the previous step's completion. Step 0 fires immediately on enrollment. Supports EMAIL, CALL, SMS, LINKEDIN channels.

**CadenceEnrollment** — Links a Contact to a Cadence. Tracks which step the contact is on (`currentStep`) and overall status (ACTIVE, PAUSED, COMPLETED, UNENROLLED).

**CadenceTask** — Concrete tasks generated from enrollment steps. Each has a `dueAt` timestamp and is assigned to a specific rep (User). Overdue = `completedAt IS NULL AND dueAt < now()`.

## Key decisions

- **PostgreSQL + Prisma** — portable, typed, easy to extend.
- **Relative delays** — each step defines its own offset from the previous step. Simple to reason about and easy to insert/reorder steps.
- **Generated tasks** — tasks are materialized rows, not computed views. This makes overdue queries fast and allows reps to see their queue without joining across enrollments.
- **Channel enum** — EMAIL, CALL, SMS, LINKEDIN cover the common outreach channels. Easy to extend.
- **Template strings** — `{{contact.name}}` style interpolation in `bodyTemplate`. No templating engine dependency; simple regex replacement at task generation time.

## Next in this phase

- Task generation logic (on enrollment + on step completion)
- Overdue detection query / endpoint
- CEO daily summary aggregation