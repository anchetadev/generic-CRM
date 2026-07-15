# Cadence Engine

Outreach-sequence engine for Generic CRM. Defines multi-step cadences, enrolls contacts, and generates scheduled tasks for reps.

## Module Structure

```
cadence/
├── index.ts              # Public API surface
├── lib/
│   ├── prisma.ts         # Prisma client singleton
│   ├── templates.ts      # {{contact.name}} template interpolation
│   └── cadence-service.ts # Core business logic (enrollment, task advancement)
├── api/
│   ├── cadences.ts       # Cadence CRUD with steps (create, read, list, update, deactivate)
│   ├── enrollments.ts    # Enrollment management (enroll, pause, resume, unenroll)
│   ├── tasks.ts          # Task queries (list by assignee, complete, skip)
│   └── overdue.ts        # Overdue detection
├── views/
│   ├── index.ts          # View module barrel export
│   ├── cadence-list.ts   # List view with enrollment counts + dashboard stats
│   ├── cadence-detail.ts # Detail view with enrollments, overdue, step analytics
│   ├── cadence-form.ts   # Create/edit form validation, defaults, submit helpers
│   ├── task-queue.ts     # Assignee task queue, overdue aggregation, complete/skip
│   └── enrollment-management.ts # Enroll, pause, resume, unenroll, batch enroll
└── README.md
```

## Setup

Requires PostgreSQL with a running database and the Prisma schema applied.

```bash
# Set database URL
export DATABASE_URL="postgresql://user:password@host:5432/generic_crm"

# Generate Prisma client
npx prisma generate

# Apply schema to database
npx prisma db push
```

## Usage

```typescript
import { cadences, enrollments, tasks, overdue } from './cadence';

// Create a cadence with steps
const cadence = await cadences.createCadence({
  name: 'Enterprise Outreach',
  description: '7-day warm intro sequence',
  steps: [
    {
      sortOrder: 0,
      name: 'Intro Email',
      delayMinutes: 0,
      channel: 'EMAIL',
      subject: 'Quick intro',
      bodyTemplate: 'Hi {{contact.name}}, ...',
    },
    {
      sortOrder: 1,
      name: 'Follow-up Call',
      delayMinutes: 2880, // 2 days
      channel: 'CALL',
      bodyTemplate: 'Call {{contact.name}} at {{contact.phone}}',
    },
  ],
});

// Enroll a contact
const { enrollment, task } = await enrollments.enroll({
  cadenceId: cadence.id,
  contactId: 'contact-uuid',
  assigneeId: 'rep-uuid',
});

// Rep completes a task — auto-advances to next step
const { completed, nextTask } = await tasks.complete(task.id);

// Rep task queue
const queue = await tasks.listTasks({ assigneeId: 'rep-uuid', status: 'pending' });

// Overdue detection
const overdueTasks = await overdue.listOverdue();
// => [{ contactName: '...', cadenceName: '...', hoursOverdue: 4.2, ... }]
```

## Views

Composable view-presentation modules that wire to the API layer and return
UI-ready aggregates. Each view is a standalone namespace exported via
`cadence/views/`. Views are framework-agnostic — they can drive CLI dashboards,
Next.js pages, or API response formatters.

```typescript
import { views } from './cadence';

const list = await views.cadenceList.listCadencesView(true, 10, 0);
const detail = await views.cadenceDetail.getCadenceDetail(cadenceId);
const queue = await views.taskQueue.listTaskQueue(assigneeId, { overdueOnly: true });
const stats = await views.cadenceList.getCadenceStats();
```

## Key Design Decisions

- **Tasks are materialized rows**, not views. Makes rep queue and overdue queries fast.
- **Relative step delays**: each step defines its own delay from the previous step's completion. Step 0 fires immediately on enrollment.
- **Template interpolation**: `{{contact.name}}`, `{{contact.email}}`, etc. Simple regex replacement — no templating engine dependency.
- **All mutations transactional**: enrollment + first task, completion + next task, cadence + steps all use `prisma.$transaction`.

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (required) |
| `NODE_ENV` | Set to `production` to disable Prisma client hot-reload caching |