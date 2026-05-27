// Phase B: Cadence Engine — TypeScript types
// Mirrors prisma/schema.prisma

import type { CadenceChannel, EnrollmentStatus } from '@prisma/client';
export type { CadenceChannel, EnrollmentStatus };

// ── Cadence ─────────────────────────────────────────────

export interface CadenceWithSteps {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  steps: CadenceStepData[];
}

export interface CadenceStepData {
  id: string;
  cadenceId: string;
  sortOrder: number;
  name: string;
  delayMinutes: number;
  channel: CadenceChannel;
  subject: string | null;
  bodyTemplate: string;
}

// ── Enrollment ─────────────────────────────────────────

export interface EnrollmentWithTasks {
  id: string;
  cadenceId: string;
  contactId: string;
  currentStepId: string | null;
  status: EnrollmentStatus;
  enrolledAt: Date;
  completedAt: Date | null;
  tasks: CadenceTaskData[];
}

// ── Task ────────────────────────────────────────────────

export interface CadenceTaskData {
  id: string;
  enrollmentId: string;
  stepId: string;
  assigneeId: string | null;
  title: string;
  channel: CadenceChannel;
  dueAt: Date;
  completedAt: Date | null;
  createdAt: Date;
}

// ── Overdue ─────────────────────────────────────────────

export interface CadenceOverdueTask extends CadenceTaskData {
  contactName: string;
  cadenceName: string;
  hoursOverdue: number;
  contactId: string;
  enrollmentId: string;
}

// ── CEO Daily ───────────────────────────────────────────

export interface CeoDailyCadenceRow {
  assigneeId: string;
  day: string;
  activeEnrollments: number;
  completedEnrollments: number;
  tasksCompletedToday: number;
  overdueTasks: number;
}

// ── State transitions ───────────────────────────────────

export const ENROLLMENT_TRANSITIONS: Record<EnrollmentStatus, EnrollmentStatus[]> = {
  ACTIVE:     ['PAUSED', 'COMPLETED', 'UNENROLLED'],
  PAUSED:     ['ACTIVE', 'UNENROLLED'],
  COMPLETED:  [],
  UNENROLLED: [],
};