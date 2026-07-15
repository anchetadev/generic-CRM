# Generic CRM

Multi-tenant CRM for lead management, outreach cadences, and meeting scheduling.

## Quick Start

```bash
git clone https://github.com/anchetadev/generic-CRM.git
cd generic-CRM
npm install
cp env.example .env   # Edit with your DATABASE_URL
npx prisma generate
npx prisma migrate deploy
npm run dev            # Starts on http://localhost:3000
```

## Dashboard

Once running, open `http://localhost:3000` for the status dashboard showing:
- **Overdue tasks** — past-due cadence tasks with hours-overdue count
- **Due today** — tasks scheduled for today
- **Completed today** — tasks finished today
- **Active enrollments / cadences / leads** — pipeline overview

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/stats` | Dashboard stats (overdue, dueToday, completedToday, etc.) |
| GET | `/api/tasks/overdue` | All overdue tasks with aggregation |
| GET | `/api/tasks/due-today` | Tasks due today |
| GET | `/api/cadences` | List all cadences |
| GET | `/api/leads` | List leads (supports `?status=` and `?search=`) |
| GET | `/api/leads/pipeline` | Leads grouped by status |
| POST | `/api/tasks/:id/complete` | Mark task complete |
| POST | `/api/tasks/:id/skip` | Skip task |

## Database

PostgreSQL via Prisma. Run migrations:

```bash
npx prisma migrate deploy    # Apply pending migrations
npx prisma migrate dev       # Create new migration (dev only)
npx prisma studio            # Browse data at http://localhost:5555
```

## Deployment (Vercel)

1. Connect the repo to Vercel: `vercel --cwd .` or link via Vercel dashboard
2. Set `DATABASE_URL` in Vercel environment variables
3. Push to `main` — Vercel auto-deploys
4. Run migration: `npx prisma migrate deploy` (via Vercel CLI or dashboard)

## Project Structure

```
generic-CRM/
├── server.ts           # Express API entry point
├── public/             # Dashboard static files
├── cadence/            # Outreach-sequence engine
│   ├── api/            # CRUD + overdue + task APIs
│   ├── lib/            # Core service (enrollment, completion, templates)
│   └── views/          # Dashboard-ready view aggregations
├── lead/               # Lead management module
│   ├── api/            # Lead CRUD + follow-up sync
│   └── views/          # List, pipeline, detail, form views
├── schema/             # TypeScript type definitions
├── prisma/             # Database schema + migrations
└── shared/             # Config and domain models
```
