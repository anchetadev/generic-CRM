// lead — Lead management module.
// Public API surface for the lead module.

// Types (re-exported from schema)
export type {
  LeadStatus,
  ActivityType,
  LeadData,
  LeadWithActivities,
  LeadActivityData,
} from '../schema/lead';

export {
  LEAD_STATUS_TRANSITIONS,
} from '../schema/lead';

// API handlers
export * as leads from './api/leads';

// Views (composable presentation layer)
export * as views from './views';

// Prisma client (for use in routes / tests)
export { prisma } from './lib/prisma';
