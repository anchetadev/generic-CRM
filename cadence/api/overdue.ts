// Overdue detection — query for all overdue tasks with contact and cadence details.

import { prisma } from '../lib/prisma';
import type { CadenceOverdueTask } from '../../schema/cadence';

export async function listOverdue(): Promise<CadenceOverdueTask[]> {
  const now = new Date();

  const tasks = await prisma.cadenceTask.findMany({
    where: {
      completedAt: null,
      dueAt: { lt: now },
    },
    include: {
      enrollment: {
        include: {
          contact: { select: { id: true, name: true } },
          cadence: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { dueAt: 'asc' },
  });

  return tasks.map((t) => ({
    id: t.id,
    enrollmentId: t.enrollmentId,
    stepId: t.stepId,
    assigneeId: t.assigneeId,
    title: t.title,
    body: t.body,
    channel: t.channel,
    dueAt: t.dueAt,
    completedAt: t.completedAt,
    createdAt: t.createdAt,
    contactId: t.enrollment.contact.id,
    contactName: t.enrollment.contact.name,
    cadenceId: t.enrollment.cadence.id,
    cadenceName: t.enrollment.cadence.name,
    hoursOverdue: Math.round(
      ((now.getTime() - t.dueAt.getTime()) / (1000 * 60 * 60)) * 10,
    ) / 10,
  }));
}