# Generic CRM

Multi-tenant CRM for lead management, outreach cadences, and meeting scheduling.

## Project Structure

```
Generic-CRM/
├── leads/            # Lead import, enrichment, scoring, lifecycle
├── cadence/          # Outreach-sequence engine
├── scheduling/       # Calendar integration & meeting booking
├── shared/
│   ├── models/       # Domain model definitions
│   └── config/       # Centralised configuration loader
└── README.md
```

## Setup

```bash
git clone <repo-url>
cd Generic-CRM
npm install
```

## Status

Phase 1 — Project scaffold and module structure.