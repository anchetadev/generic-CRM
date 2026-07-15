// Task API — list by assignee, list overdue, complete, skip.

import { prisma } from '../lib/prisma';
import { completeTask, skipTask } from '../lib/cadence-service';
import type { CadenceTaskData } from '../../schema/cadence';
import type { CadenceTask } from '@prisma/client';

// ── List by assignee (rep task queue) ───────────────────

export interface ListTasksParams {
  assigneeId?: string;
  status?: 'pending' | 'completed'; // completedAt null/not-null
  limit?: number;
  offset?: number;
}

export async function listTasks(
  params: ListTasksParams = {},
): Promise<{ items: CadenceTaskData[]; total: number }> {
  const where: any = {};

  if (params.assigneeId) {
    where.assigneeId = params.assigneeId;
  }

  if (params.status === 'pending') {
    where.completedAt = null;
  } else if (params.status === 'completed') {
    where.completedAt = { not: null };
  }

  const [items, total] = await Promise.all([
    prisma.cadenceTask.findMany({
      where,
      include: {
        enrollment: {
          select: {
            contact: { select: { name: true } },
            cadence: { select: { name: true } },
          },
        },
      },
      take: params.limit,
      skip: params.offset,
      orderBy: { dueAt: 'asc' },
    }),
    prisma.cadenceTask.count({ where }),
  ]);

  return {
    items: items.map(toTaskData),
    total,
  };
}

// ── Get task ─────────────────────────────────────────────

export async function getTask(id: string): Promise<CadenceTaskData | null> {
  const task = await prisma.cadenceTask.findUnique({
    where: { id },
    include: {
      enrollment: {
        select: {
          contact: { select: { name: true } },
          cadence: { select: { name: true } },
        },
      },
    },
  });

  return task ? toTaskData(task) : null;
}

// ── Complete ─────────────────────────────────────────────

export async function complete(
  taskId: string,
  nextAssigneeId?: string,
): Promise<{
  completed: CadenceTaskData;
  nextTask: CadenceTaskData | null;
}> {
  const result = await completeTask({ taskId, assigneeId: nextAssigneeId });
  return {
    completed: toTaskData(result.completed),
    nextTask: result.nextTask ? toTaskData(result.nextTask) : null,
  };
}

// ── Skip ─────────────────────────────────────────────────

export async function skip(
  taskId: string,
): Promise<{
  skipped: CadenceTaskData;
  nextTask: CadenceTaskData | null;
}> {
  const result = await skipTask(taskId);
  return {
    skipped: toTaskData(result.skipped),
    nextTask: result.nextTask ? toTaskData(result.nextTask) : null,
  };
}

// ── Helpers ─────────────────────────────────────────────

function toTaskData(t: any): CadenceTaskData {
  return {
    id: t.id,
    enrollmentId: t.enrollmentId,
    stepId: t.stepId,
    assigneeId: t.assigneeId,
    leadId: t.leadId ?? null,
    title: t.title,
    body: t.body ?? null,
    channel: t.channel,
    status: t.status ?? 'PENDING',
    dueAt: t.dueAt,
    completedAt: t.completedAt,
    createdAt: t.createdAt,
    contactName: t.enrollment?.contact?.name,
    cadenceName: t.enrollment?.cadence?.name,
  };
}