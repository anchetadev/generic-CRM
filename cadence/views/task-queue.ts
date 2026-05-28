// Task queue view — assignee task list with overdue filtering, complete, skip.
// Wires to cadence/api/tasks.ts and cadence/api/overdue.ts.

import * as taskApi from '../api/tasks';
import * as overdueApi from '../api/overdue';
import type {
  CadenceTaskData,
  CadenceOverdueTask,
} from '../../schema/cadence';

// ── Types ───────────────────────────────────────────────

export interface TaskQueueRow {
  id: string;
  title: string;
  body: string | null;
  channel: string;
  dueAt: Date;
  completedAt: Date | null;
  isOverdue: boolean;
  contactName: string;
  cadenceName: string;
  enrollmentId: string;
  stepId: string;
  assigneeId: string | null;
}

export interface TaskQueueResult {
  items: TaskQueueRow[];
  total: number;
  pendingCount: number;
  overdueCount: number;
  completedCount: number;
}

export interface TaskActionResult {
  success: boolean;
  completed?: CadenceTaskData;
  nextTask?: CadenceTaskData | null;
  error?: string;
}

// ── List by assignee (task queue) ───────────────────────

export async function listTaskQueue(
  assigneeId: string,
  filter?: { status?: 'pending' | 'completed'; overdueOnly?: boolean },
  limit?: number,
  offset?: number,
): Promise<TaskQueueResult> {
  const status = filter?.status ?? 'pending';
  const { items, total } = await taskApi.listTasks({
    assigneeId,
    status,
    limit,
    offset,
  });

  const now = new Date();

  let rows: TaskQueueRow[] = items.map((t) => ({
    id: t.id,
    title: t.title,
    body: t.body,
    channel: t.channel,
    dueAt: t.dueAt,
    completedAt: t.completedAt,
    isOverdue: !t.completedAt && t.dueAt < now,
    contactName: (t as any).contactName ?? 'Unknown',
    cadenceName: (t as any).cadenceName ?? 'Unknown',
    enrollmentId: t.enrollmentId,
    stepId: t.stepId,
    assigneeId: t.assigneeId,
  }));

  if (filter?.overdueOnly) {
    rows = rows.filter((r) => r.isOverdue);
  }

  const pendingCount = rows.filter((r) => !r.completedAt).length;
  const overdueCount = rows.filter((r) => r.isOverdue).length;
  const completedCount = rows.filter((r) => r.completedAt).length;

  return { items: rows, total, pendingCount, overdueCount, completedCount };
}

// ── Overdue tasks for dashboard ────────────────────────

export interface OverdueQueueResult {
  items: CadenceOverdueTask[];
  total: number;
  byCadence: { cadenceId: string; cadenceName: string; count: number }[];
  byAssignee: { assigneeId: string | null; count: number }[];
}

export async function getOverdueQueue(): Promise<OverdueQueueResult> {
  const items = await overdueApi.listOverdue();

  // Aggregate by cadence
  const cadenceMap = new Map<string, { cadenceId: string; cadenceName: string; count: number }>();
  for (const t of items) {
    const entry = cadenceMap.get(t.enrollmentId);
    if (!entry) {
      cadenceMap.set(t.enrollmentId, { cadenceId: t.enrollmentId, cadenceName: t.cadenceName, count: 1 });
    } else {
      entry.count++;
    }
  }
  // Deduplicate by cadence name for the byCadence view
  const cadenceNameMap = new Map<string, { cadenceName: string; count: number }>();
  for (const t of items) {
    const entry = cadenceNameMap.get(t.cadenceName);
    if (entry) {
      entry.count++;
    } else {
      cadenceNameMap.set(t.cadenceName, { cadenceName: t.cadenceName, count: 1 });
    }
  }

  // Aggregate by assignee
  const assigneeMap = new Map<string, number>();
  for (const t of items) {
    const key = t.assigneeId ?? '__UNASSIGNED__';
    assigneeMap.set(key, (assigneeMap.get(key) ?? 0) + 1);
  }

  return {
    items,
    total: items.length,
    byCadence: Array.from(cadenceNameMap.values()).map((v) => ({
      cadenceId: '', // not available without cross-referencing
      cadenceName: v.cadenceName,
      count: v.count,
    })),
    byAssignee: Array.from(assigneeMap.entries()).map(([assigneeId, count]) => ({
      assigneeId: assigneeId === '__UNASSIGNED__' ? null : assigneeId,
      count,
    })),
  };
}

// ── Complete task ───────────────────────────────────────

export async function completeTask(
  taskId: string,
  nextAssigneeId?: string,
): Promise<TaskActionResult> {
  try {
    const result = await taskApi.complete(taskId, nextAssigneeId);
    return { success: true, completed: result.completed, nextTask: result.nextTask };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Complete failed' };
  }
}

// ── Skip task ───────────────────────────────────────────

export async function skipTask(taskId: string): Promise<TaskActionResult> {
  try {
    const result = await taskApi.skip(taskId);
    return { success: true, completed: result.skipped, nextTask: result.nextTask };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Skip failed' };
  }
}

// ── Task detail ─────────────────────────────────────────

export interface TaskDetailView {
  task: CadenceTaskData | null;
  metadata: {
    contactName: string;
    cadenceName: string;
    isOverdue: boolean;
  };
}

export async function getTaskDetail(taskId: string): Promise<TaskDetailView | null> {
  const task = await taskApi.getTask(taskId);
  if (!task) return null;

  const now = new Date();

  return {
    task,
    metadata: {
      contactName: (task as any).contactName ?? 'Unknown',
      cadenceName: (task as any).cadenceName ?? 'Unknown',
      isOverdue: !task.completedAt && task.dueAt < now,
    },
  };
}