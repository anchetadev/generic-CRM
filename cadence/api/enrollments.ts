// Enrollment API — enroll, list by contact/cadence, pause, resume, unenroll.

import { prisma } from '../lib/prisma';
import { enrollContact } from '../lib/cadence-service';
import type { EnrollmentWithTasks, CadenceTaskData } from '../../schema/cadence';
import type { CadenceEnrollment } from '@prisma/client';

// ── Enroll ──────────────────────────────────────────────

export interface EnrollInput {
  cadenceId: string;
  contactId: string;
  assigneeId?: string;
}

export async function enroll(input: EnrollInput): Promise<{
  enrollment: CadenceEnrollment;
  task: CadenceTaskData;
}> {
  const result = await enrollContact(input);
  return {
    enrollment: result.enrollment,
    task: toTaskData(result.task),
  };
}

// ── Get enrollment ──────────────────────────────────────

export async function getEnrollment(
  id: string,
): Promise<EnrollmentWithTasks | null> {
  const enrollment = await prisma.cadenceEnrollment.findUnique({
    where: { id },
    include: {
      tasks: { orderBy: { createdAt: 'desc' } },
    },
  });

  return enrollment ? toEnrollmentWithTasks(enrollment) : null;
}

// ── List by contact ─────────────────────────────────────

export async function listByContact(
  contactId: string,
): Promise<EnrollmentWithTasks[]> {
  const enrollments = await prisma.cadenceEnrollment.findMany({
    where: { contactId },
    include: {
      tasks: { orderBy: { createdAt: 'desc' } },
    },
    orderBy: { enrolledAt: 'desc' },
  });

  return enrollments.map(toEnrollmentWithTasks);
}

// ── List by cadence ─────────────────────────────────────

export async function listByCadence(
  cadenceId: string,
  status?: string,
): Promise<EnrollmentWithTasks[]> {
  const where: any = { cadenceId };
  if (status) where.status = status;

  const enrollments = await prisma.cadenceEnrollment.findMany({
    where,
    include: {
      tasks: { orderBy: { createdAt: 'desc' } },
    },
    orderBy: { enrolledAt: 'desc' },
  });

  return enrollments.map(toEnrollmentWithTasks);
}

// ── Pause / Resume / Unenroll ───────────────────────────

export async function pauseEnrollment(id: string): Promise<CadenceEnrollment> {
  return prisma.cadenceEnrollment.update({
    where: { id },
    data: { status: 'PAUSED' },
  });
}

export async function resumeEnrollment(id: string): Promise<CadenceEnrollment> {
  return prisma.cadenceEnrollment.update({
    where: { id },
    data: { status: 'ACTIVE' },
  });
}

export async function unenrollContact(id: string): Promise<CadenceEnrollment> {
  return prisma.cadenceEnrollment.update({
    where: { id },
    data: { status: 'UNENROLLED', completedAt: new Date() },
  });
}

// ── Helpers ─────────────────────────────────────────────

function toEnrollmentWithTasks(enrollment: any): EnrollmentWithTasks {
  return {
    id: enrollment.id,
    cadenceId: enrollment.cadenceId,
    contactId: enrollment.contactId,
    currentStepId: enrollment.currentStepId,
    status: enrollment.status,
    enrolledAt: enrollment.enrolledAt,
    completedAt: enrollment.completedAt,
    tasks: (enrollment.tasks || []).map(toTaskData),
  };
}

function toTaskData(task: any): CadenceTaskData {
  return {
    id: task.id,
    enrollmentId: task.enrollmentId,
    stepId: task.stepId,
    assigneeId: task.assigneeId,
    title: task.title,
    body: task.body,
    channel: task.channel,
    dueAt: task.dueAt,
    completedAt: task.completedAt,
    createdAt: task.createdAt,
  };
}