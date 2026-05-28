// cadence — Outreach sequence engine.
// Public API surface for the cadence module.

// Types (re-exported from schema)
export type {
  CadenceChannel,
  EnrollmentStatus,
  CadenceWithSteps,
  CadenceStepData,
  EnrollmentWithTasks,
  CadenceTaskData,
  CadenceOverdueTask,
  CeoDailyCadenceRow,
} from '../schema/cadence';

export {
  ENROLLMENT_TRANSITIONS,
} from '../schema/cadence';

// Core service
export {
  enrollContact,
  completeTask,
  skipTask,
  resolveTemplateBody,
} from './lib/cadence-service';

// API handlers
export * as cadences from './api/cadences';
export * as enrollments from './api/enrollments';
export * as tasks from './api/tasks';
export * as overdue from './api/overdue';

// Views (composable presentation layer)
export * as views from './views';

// Prisma client (for use in routes / tests)
export { prisma } from './lib/prisma';