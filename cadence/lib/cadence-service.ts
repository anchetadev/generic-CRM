// Core business logic for the cadence engine.
// Enrollment, task generation, step advancement.

import { prisma } from './prisma';
import { interpolate, TemplateContext } from './templates';
import type {
  Prisma,
  CadenceChannel,
  CadenceStep,
  CadenceEnrollment,
  CadenceTask,
  Contact,
} from '@prisma/client';

// ── Enrollment ──────────────────────────────────────────

export interface EnrollParams {
  cadenceId: string;
  contactId: string;
  assigneeId?: string;
}

/** Enroll a contact in a cadence: create enrollment + generate first task. */
export async function enrollContact(
  params: EnrollParams,
): Promise<{ enrollment: CadenceEnrollment; task: CadenceTask }> {
  return prisma.$transaction(async (tx) => {
    // 1. Fetch cadence with steps
    const cadence = await tx.cadence.findUniqueOrThrow({
      where: { id: params.cadenceId },
      include: { steps: { orderBy: { sortOrder: 'asc' } } },
    });

    const firstStep = cadence.steps[0];
    if (!firstStep) throw new Error('Cadence has no steps');

    // 2. Create enrollment
    const enrollment = await tx.cadenceEnrollment.create({
      data: {
        cadenceId: params.cadenceId,
        contactId: params.contactId,
        currentStepId: firstStep.id,
        status: 'ACTIVE',
      },
    });

    // 3. Generate first task (step 0 fires immediately)
    const task = await generateTask(tx, {
      enrollmentId: enrollment.id,
      step: firstStep,
      contactId: params.contactId,
      assigneeId: params.assigneeId,
      delayMinutes: 0, // first step fires immediately
    });

    return { enrollment, task };
  });
}

// ── Task Generation ─────────────────────────────────────

interface GenerateTaskParams {
  enrollmentId: string;
  step: CadenceStep;
  contactId: string;
  assigneeId?: string;
  delayMinutes: number;
}

async function generateTask(
  tx: Prisma.TransactionClient,
  params: GenerateTaskParams,
): Promise<CadenceTask> {
  const contact = await tx.contact.findUniqueOrThrow({
    where: { id: params.contactId },
    select: { name: true, email: true, company: true, phone: true },
  });

  const title = interpolate(params.step.name, { contact });
  const body = interpolate(params.step.bodyTemplate, { contact });

  // If step name doesn't have a template, use "Step: <name> for <contact>"
  const resolvedTitle = params.step.name.includes('{{')
    ? interpolate(params.step.name, { contact })
    : `${params.step.name} for ${contact.name}`;

  return tx.cadenceTask.create({
    data: {
      enrollmentId: params.enrollmentId,
      stepId: params.step.id,
      assigneeId: params.assigneeId,
      title: resolvedTitle,
      body,
      channel: params.step.channel,
      dueAt: new Date(Date.now() + params.delayMinutes * 60 * 1000),
    },
  });
}

// ── Task Completion & Step Advancement ──────────────────

export interface CompleteTaskParams {
  taskId: string;
  assigneeId?: string; // optional: only set if advancing to next step for a different rep
}

/** Complete a task and advance to the next step. Returns the next task (or null if cadence complete). */
export async function completeTask(
  params: CompleteTaskParams,
): Promise<{ completed: CadenceTask; nextTask: CadenceTask | null }> {
  return prisma.$transaction(async (tx) => {
    // 0. Guard: already-completed tasks must not advance again
    const existing = await tx.cadenceTask.findUniqueOrThrow({
      where: { id: params.taskId },
      include: { step: true, enrollment: true },
    });

    if (existing.completedAt !== null) {
      return { completed: existing, nextTask: null };
    }

    if (!existing.enrollment) throw new Error('Task has no enrollment');

    // 1. Mark task completed
    const task = await tx.cadenceTask.update({
      where: { id: params.taskId },
      data: { completedAt: new Date() },
      include: { step: true, enrollment: true },
    });

    const enrollment = task.enrollment;
    const currentStepSortOrder = task.step.sortOrder;

    // 2. Find next step
    const nextStep = await tx.cadenceStep.findFirst({
      where: {
        cadenceId: enrollment.cadenceId,
        sortOrder: { gt: currentStepSortOrder },
      },
      orderBy: { sortOrder: 'asc' },
    });

    if (!nextStep) {
      // Cadence complete — no more steps
      await tx.cadenceEnrollment.update({
        where: { id: enrollment.id },
        data: { status: 'COMPLETED', completedAt: new Date(), currentStepId: null },
      });
      return { completed: task, nextTask: null };
    }

    // 3. Advance enrollment to next step
    await tx.cadenceEnrollment.update({
      where: { id: enrollment.id },
      data: { currentStepId: nextStep.id },
    });

    // 4. Generate next task with delay
    const nextTaskRecord = await generateTask(tx, {
      enrollmentId: enrollment.id,
      step: nextStep,
      contactId: enrollment.contactId,
      assigneeId: params.assigneeId ?? task.assigneeId ?? undefined,
      delayMinutes: nextStep.delayMinutes,
    });

    return { completed: task, nextTask: nextTaskRecord };
  });
}

// ── Skip Task ───────────────────────────────────────────

export async function skipTask(
  taskId: string,
): Promise<{ skipped: CadenceTask; nextTask: CadenceTask | null }> {
  return prisma.$transaction(async (tx) => {
    const task = await tx.cadenceTask.findUniqueOrThrow({
      where: { id: taskId },
      include: { step: true, enrollment: true },
    });

    // Guard: already-completed tasks must not advance again
    if (task.completedAt !== null) {
      return { skipped: task, nextTask: null };
    }

    if (!task.enrollment) throw new Error('Task has no enrollment');

    // Mark as completed with a note that it was skipped (just complete it — no "skipped" status in Prisma schema)
    await tx.cadenceTask.update({
      where: { id: taskId },
      data: { completedAt: new Date() },
    });

    // Advance same as complete
    const enrollment = task.enrollment;
    const currentStepSortOrder = task.step.sortOrder;

    const nextStep = await tx.cadenceStep.findFirst({
      where: {
        cadenceId: enrollment.cadenceId,
        sortOrder: { gt: currentStepSortOrder },
      },
      orderBy: { sortOrder: 'asc' },
    });

    if (!nextStep) {
      await tx.cadenceEnrollment.update({
        where: { id: enrollment.id },
        data: { status: 'COMPLETED', completedAt: new Date(), currentStepId: null },
      });
      return { skipped: task, nextTask: null };
    }

    await tx.cadenceEnrollment.update({
      where: { id: enrollment.id },
      data: { currentStepId: nextStep.id },
    });

    const nextTaskRecord = await generateTask(tx, {
      enrollmentId: enrollment.id,
      step: nextStep,
      contactId: enrollment.contactId,
      assigneeId: task.assigneeId ?? undefined,
      delayMinutes: nextStep.delayMinutes,
    });

    return { skipped: task, nextTask: nextTaskRecord };
  });
}

// ── Template Resolution (exposed for API) ───────────────

export async function resolveTemplateBody(
  stepId: string,
  contactId: string,
): Promise<string> {
  const [step, contact] = await Promise.all([
    prisma.cadenceStep.findUniqueOrThrow({ where: { id: stepId } }),
    prisma.contact.findUniqueOrThrow({
      where: { id: contactId },
      select: { name: true, email: true, company: true, phone: true },
    }),
  ]);

  return interpolate(step.bodyTemplate, { contact });
}