// Overdue detection — query for overdue and due-today tasks with contact and cadence details.

import { prisma } from '../lib/prisma';
import type { CadenceOverdueTask } from '../../schema/cadence';

export async function listOverdue(): Promise<CadenceOverdueTask[]> {
  const now = new Date();

  const tasks = await prisma.cadenceTask.findMany({
    where: {
      completedAt: null,
      dueAt: { lt: now },
      enrollment: { status: 'ACTIVE' },
    },
    include: {
      enrollment: {
        include: {
          contact: { select: { id: true, name: true } },
          cadence: { select: { id: true, name: true } },
        },
      },
      lead: { select: { leadSource: true } },
    },
    orderBy: { dueAt: 'asc' },
  });

  return tasks.map((t) => ({
    id: t.id,
    enrollmentId: t.enrollmentId,
    stepId: t.stepId,
    assigneeId: t.assigneeId,
    leadId: t.leadId,
    title: t.title,
    body: t.body,
    channel: t.channel,
    status: t.status,
    dueAt: t.dueAt,
    completedAt: t.completedAt,
    createdAt: t.createdAt,
    contactId: t.enrollment.contact.id,
    contactName: t.enrollment.contact.name,
    cadenceId: t.enrollment.cadence.id,
    cadenceName: t.enrollment.cadence.name,
    leadSource: t.lead?.leadSource ?? null,
    hoursOverdue: Math.round(
      ((now.getTime() - t.dueAt.getTime()) / (1000 * 60 * 60)) * 10,
    ) / 10,
  }));
}

/** Tasks due today (within day boundaries, not yet completed). */
export async function listDueToday(): Promise<CadenceOverdueTask[]> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const tasks = await prisma.cadenceTask.findMany({
    where: {
      completedAt: null,
      dueAt: { gte: startOfDay, lt: endOfDay },
      enrollment: { status: 'ACTIVE' },
    },
    include: {
      enrollment: {
        include: {
          contact: { select: { id: true, name: true } },
          cadence: { select: { id: true, name: true } },
        },
      },
      lead: { select: { leadSource: true } },
    },
    orderBy: { dueAt: 'asc' },
  });

  return tasks.map((t) => ({
    id: t.id,
    enrollmentId: t.enrollmentId,
    stepId: t.stepId,
    assigneeId: t.assigneeId,
    leadId: t.leadId,
    title: t.title,
    body: t.body,
    channel: t.channel,
    status: t.status,
    dueAt: t.dueAt,
    completedAt: t.completedAt,
    createdAt: t.createdAt,
    contactId: t.enrollment.contact.id,
    contactName: t.enrollment.contact.name,
    cadenceId: t.enrollment.cadence.id,
    cadenceName: t.enrollment.cadence.name,
    leadSource: t.lead?.leadSource ?? null,
    hoursOverdue: 0,
  }));
}

/** Tasks completed today (for "sent yesterday" comparisons). */
export async function listCompletedToday(): Promise<CadenceOverdueTask[]> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const tasks = await prisma.cadenceTask.findMany({
    where: {
      completedAt: { gte: startOfDay, lt: endOfDay },
    },
    include: {
      enrollment: {
        include: {
          contact: { select: { id: true, name: true } },
          cadence: { select: { id: true, name: true } },
        },
      },
      lead: { select: { leadSource: true } },
    },
    orderBy: { completedAt: 'desc' },
  });

  return tasks.map((t) => ({
    id: t.id,
    enrollmentId: t.enrollmentId,
    stepId: t.stepId,
    assigneeId: t.assigneeId,
    leadId: t.leadId,
    title: t.title,
    body: t.body,
    channel: t.channel,
    status: t.status,
    dueAt: t.dueAt,
    completedAt: t.completedAt,
    createdAt: t.createdAt,
    contactId: t.enrollment.contact.id,
    contactName: t.enrollment.contact.name,
    cadenceId: t.enrollment.cadence.id,
    cadenceName: t.enrollment.cadence.name,
    leadSource: t.lead?.leadSource ?? null,
    hoursOverdue: 0,
  }));
}
