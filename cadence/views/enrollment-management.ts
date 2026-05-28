// Enrollment management view — enroll, pause, resume, unenroll contacts.
// Wires to cadence/api/enrollments.ts.

import * as enrollmentApi from '../api/enrollments';
import * as cadenceApi from '../api/cadences';
import type {
  EnrollmentWithTasks,
  CadenceTaskData,
  CadenceWithSteps,
} from '../../schema/cadence';
import type { CadenceEnrollment } from '@prisma/client';

// ── Types ───────────────────────────────────────────────

export interface EnrollResult {
  enrollment: CadenceEnrollment;
  task: CadenceTaskData;
}

export interface EnrollmentActionError {
  code: string;
  message: string;
}

export type EnrollmentActionResult =
  | { success: true; enrollment: CadenceEnrollment; task?: CadenceTaskData }
  | { success: false; error: EnrollmentActionError };

// ── Enroll ──────────────────────────────────────────────

export async function enrollContact(
  cadenceId: string,
  contactId: string,
  assigneeId?: string,
): Promise<EnrollmentActionResult> {
  try {
    const result = await enrollmentApi.enroll({ cadenceId, contactId, assigneeId });
    return { success: true, enrollment: result.enrollment, task: result.task };
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return {
        success: false,
        error: {
          code: 'DUPLICATE',
          message: 'Contact is already enrolled in this cadence.',
        },
      };
    }
    return {
      success: false,
      error: { code: 'ERROR', message: err?.message ?? 'Enrollment failed' },
    };
  }
}

// ── Pause ───────────────────────────────────────────────

export async function pauseEnrollment(
  enrollmentId: string,
): Promise<EnrollmentActionResult> {
  try {
    const enrollment = await enrollmentApi.pauseEnrollment(enrollmentId);
    return { success: true, enrollment };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'ERROR', message: err?.message ?? 'Pause failed' },
    };
  }
}

// ── Resume ──────────────────────────────────────────────

export async function resumeEnrollment(
  enrollmentId: string,
): Promise<EnrollmentActionResult> {
  try {
    const enrollment = await enrollmentApi.resumeEnrollment(enrollmentId);
    return { success: true, enrollment };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'ERROR', message: err?.message ?? 'Resume failed' },
    };
  }
}

// ── Unenroll ────────────────────────────────────────────

export async function unenrollContact(
  enrollmentId: string,
): Promise<EnrollmentActionResult> {
  try {
    const enrollment = await enrollmentApi.unenrollContact(enrollmentId);
    return { success: true, enrollment };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'ERROR', message: err?.message ?? 'Unenroll failed' },
    };
  }
}

// ── Enrollment detail (with cadence info) ───────────────

export interface EnrollmentDetailView {
  enrollment: EnrollmentWithTasks;
  cadence: CadenceWithSteps | null;
  taskStats: {
    total: number;
    pending: number;
    completed: number;
    overdue: number;
    nextDueAt: Date | null;
  };
}

export async function getEnrollmentDetail(
  enrollmentId: string,
): Promise<EnrollmentDetailView | null> {
  const enrollment = await enrollmentApi.getEnrollment(enrollmentId);
  if (!enrollment) return null;

  const cadence = await cadenceApi.getCadence(enrollment.cadenceId);

  const now = new Date();
  const pendingTasks = enrollment.tasks.filter((t) => !t.completedAt);
  const overdueTasks = pendingTasks.filter((t) => t.dueAt < now);
  const futureTasks = pendingTasks
    .filter((t) => t.dueAt >= now)
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());

  return {
    enrollment,
    cadence,
    taskStats: {
      total: enrollment.tasks.length,
      pending: pendingTasks.length,
      completed: enrollment.tasks.filter((t) => t.completedAt).length,
      overdue: overdueTasks.length,
      nextDueAt: futureTasks[0]?.dueAt ?? null,
    },
  };
}

// ── Batch enrollment ────────────────────────────────────

export async function batchEnroll(
  cadenceId: string,
  contactIds: string[],
  assigneeId?: string,
): Promise<{
  succeeded: EnrollResult[];
  failed: { contactId: string; error: string }[];
}> {
  const succeeded: EnrollResult[] = [];
  const failed: { contactId: string; error: string }[] = [];

  for (const contactId of contactIds) {
    try {
      const result = await enrollmentApi.enroll({ cadenceId, contactId, assigneeId });
      succeeded.push(result);
    } catch (err: any) {
      failed.push({ contactId, error: err?.message ?? 'Enrollment failed' });
    }
  }

  return { succeeded, failed };
}