// Cadence detail view — steps, enrollments, overdue tasks for a single cadence.
// Wires to cadence/api/cadences.ts, cadence/api/enrollments.ts, cadence/api/overdue.ts.

import * as cadenceApi from '../api/cadences';
import * as enrollmentApi from '../api/enrollments';
import * as overdueApi from '../api/overdue';
import type {
  CadenceWithSteps,
  EnrollmentWithTasks,
  CadenceOverdueTask,
  CadenceStepData,
} from '../../schema/cadence';

// ── Detail result ──────────────────────────────────────

export interface CadenceDetailView {
  cadence: CadenceWithSteps;
  enrollments: EnrollmentDetailRow[];
  overdueTasks: CadenceOverdueTask[];
  summary: CadenceDetailSummary;
}

export interface EnrollmentDetailRow {
  id: string;
  contactId: string;
  status: string;
  currentStepName: string | null;
  enrolledAt: Date;
  completedAt: Date | null;
  taskCount: number;
  pendingTaskCount: number;
  overdueTaskCount: number;
  nextTaskDueAt: Date | null;
}

export interface CadenceDetailSummary {
  totalEnrollments: number;
  activeEnrollments: number;
  pausedEnrollments: number;
  completedEnrollments: number;
  unenrolledCount: number;
  totalSteps: number;
  pendingTasks: number;
  overdueTasks: number;
}

// ── Fetch full detail ───────────────────────────────────

export async function getCadenceDetail(id: string): Promise<CadenceDetailView | null> {
  const cadence = await cadenceApi.getCadence(id);
  if (!cadence) return null;

  const [enrollments, overdueTasks] = await Promise.all([
    enrollmentApi.listByCadence(id),
    getOverdueTasksForCadence(id),
  ]);

  const enrollmentRows = enrollments.map(toEnrollmentRow);

  const summary: CadenceDetailSummary = {
    totalEnrollments: enrollments.length,
    activeEnrollments: enrollments.filter((e) => e.status === 'ACTIVE').length,
    pausedEnrollments: enrollments.filter((e) => e.status === 'PAUSED').length,
    completedEnrollments: enrollments.filter((e) => e.status === 'COMPLETED').length,
    unenrolledCount: enrollments.filter((e) => e.status === 'UNENROLLED').length,
    totalSteps: cadence.steps.length,
    pendingTasks: enrollmentRows.reduce((sum, r) => sum + r.pendingTaskCount, 0),
    overdueTasks: overdueTasks.length,
  };

  return {
    cadence,
    enrollments: enrollmentRows,
    overdueTasks,
    summary,
  };
}

// ── Helpers ─────────────────────────────────────────────

function toEnrollmentRow(e: EnrollmentWithTasks): EnrollmentDetailRow {
  const now = new Date();
  const pendingTasks = e.tasks.filter((t) => !t.completedAt);
  const overdueTasks = pendingTasks.filter((t) => t.dueAt < now);
  const nextTask = pendingTasks
    .filter((t) => t.dueAt >= now)
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())[0] ?? null;

  let currentStepName: string | null = null;
  if (e.currentStepId && e.tasks.length > 0) {
    const currentTask = e.tasks.find((t) => t.stepId === e.currentStepId);
    currentStepName = currentTask?.title ?? 'Unknown step';
  }

  return {
    id: e.id,
    contactId: e.contactId,
    status: e.status,
    currentStepName,
    enrolledAt: e.enrolledAt,
    completedAt: e.completedAt,
    taskCount: e.tasks.length,
    pendingTaskCount: pendingTasks.length,
    overdueTaskCount: overdueTasks.length,
    nextTaskDueAt: nextTask?.dueAt ?? null,
  };
}

/** Filter overdue tasks specific to this cadence (uses cadenceId on the task). */
async function getOverdueTasksForCadence(
  cadenceId: string,
): Promise<CadenceOverdueTask[]> {
  const all = await overdueApi.listOverdue();
  return all.filter((t) => t.cadenceId === cadenceId);
}

// ── Steps view ──────────────────────────────────────────

export async function getStepDetails(
  cadenceId: string,
): Promise<{ steps: CadenceStepData[]; enrollmentCount: number } | null> {
  const cadence = await cadenceApi.getCadence(cadenceId);
  if (!cadence) return null;

  const enrollments = await enrollmentApi.listByCadence(cadenceId);

  return {
    steps: cadence.steps,
    enrollmentCount: enrollments.length,
  };
}
