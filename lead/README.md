# leads

Lead management module. Handles lead CRUD, lifecycle tracking, activities, and pipeline views.

## Structure

```
lead/
├── api/
│   └── leads.ts        # CRUD, search, status transitions, activities
├── views/
│   ├── lead-list.ts    # List view with status counts + pipeline
│   ├── lead-detail.ts  # Detail view with activity timeline
│   ├── lead-form.ts    # Form validation + submit helpers
│   └── index.ts        # Barrel export
├── lib/
│   └── prisma.ts       # Prisma singleton
├── index.ts            # Public API surface
└── README.md
```

## Usage

```typescript
import { leads, views } from './lead';

// API layer
const lead = await leads.createLead({ name: 'Acme Corp', email: 'info@acme.com' });
const { items, total } = await leads.listLeads({ status: 'NEW', limit: 20 });

// Views layer
const listView = await views.leadList.listLeadsView({ status: 'NEW' });
const detail = await views.leadDetail.getLeadDetail(leadId);
const pipeline = await views.leadList.getLeadPipeline(ownerId);

// Form helpers
const result = await views.leadForm.submitCreateLead({ name: 'New Lead' });
if (result.success) { /* result.data is the created lead */ }

// Activities
const withActivity = await leads.addActivity(leadId, {
  type: 'NOTE',
  subject: 'Initial contact',
  body: 'Reached out via LinkedIn',
});
```

## Lead Lifecycle

```
NEW → CONTACTED → QUALIFIED → CONVERTED
                  → DISQUALIFIED
```

## Schema

- **Lead**: name, email, phone, company, source, status, owner, notes
- **LeadActivity**: type (NOTE/EMAIL/CALL/MEETING/TASK), subject, body
