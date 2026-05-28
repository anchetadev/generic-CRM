// Cadence list view — display all cadences with status, step count, and active enrollment counts.
// Wires to cadence/api/cadences.ts and cadence/api/enrollments.ts.

import * as cadenceApi from '../api/cadences';
import * as enrollmentApi from '../api/enrollments';
import type { CadenceWithSteps, EnrollmentWithTasks } from '../../schema/cadence';

// ── Row types ───────────────────────────────────────────

export interface CadenceListRow {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  stepCount: number;
  activeEnrollmentCount: number;
  totalEnrollmentCount: number;
  createdAt: Date;
  updatedAt: Date;
  steps: CadenceWithSteps['steps'];
}

export interface CadenceListResult {
  items: CadenceListRow[];
  total: number;
  activeCount: number;
  inactiveCount: number;
}

// ── List all with enrollment counts ─────────────────────

export async function listCadencesView(
  isActive?: boolean,
  limit?: number,
  offset?: number,
): Promise<CadenceListResult> {
  const { items, total } = await cadenceApi.listCadences({ isActive, limit, offset });

  // Collect cadence IDs to batch-fetch enrollment counts
  const cadenceIds = items.map((c) => c.id);
  const enrollmentCountsMap = new Map<string, { active: number; total: number }>();

  const enrollmentPromises = cadenceIds.map(async (cadenceId) => {
    try {
      const enrollments = await enrollmentApi.listByCadence(cadenceId);
      const active = enrollments.filter((e) => e.status === 'ACTIVE').length;
      enrollmentCountsMap.set(cadenceId, { active, total: enrollments.length });
    } catch {
      enrollmentCountsMap.set(cadenceId, { active: 0, total: 0 });
    }
  });

  await Promise.all(enrollmentPromises);

  // Build rows with counts
  let activeCount = 0;
  let inactiveCount = 0;

  const rows: CadenceListRow[] = items.map((c) => {
    if (c.isActive) activeCount++;
    else inactiveCount++;

    const counts = enrollmentCountsMap.get(c.id) ?? { active: 0, total: 0 };

    return {
      id: c.id,
      name: c.name,
      description: c.description,
      isActive: c.isActive,
      stepCount: c.steps.length,
      activeEnrollmentCount: counts.active,
      totalEnrollmentCount: counts.total,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      steps: c.steps,
    };
  });

  return { items: rows, total, activeCount, inactiveCount };
}

// ── Quick lookup (no enrollment counts) ─────────────────

export async function getCadenceSummary(
  id: string,
): Promise<CadenceListRow | null> {
  const cadence = await cadenceApi.getCadence(id);
  if (!cadence) return null;

  const enrollments = await enrollmentApi.listByCadence(id);
  const active = enrollments.filter((e) => e.status === 'ACTIVE').length;

  return {
    id: cadence.id,
    name: cadence.name,
    description: cadence.description,
    isActive: cadence.isActive,
    stepCount: cadence.steps.length,
    activeEnrollmentCount: active,
    totalEnrollmentCount: enrollments.length,
    createdAt: cadence.createdAt,
    updatedAt: cadence.updatedAt,
    steps: cadence.steps,
  };
}

// ── Summary stats for dashboard ─────────────────────────

export interface CadenceStats {
  totalCadences: number;
  activeCadences: number;
  totalEnrollments: number;
  activeEnrollments: number;
}

export async function getCadenceStats(): Promise<CadenceStats> {
  const { items, total } = await cadenceApi.listCadences();
  const activeCadences = items.filter((c) => c.isActive).length;

  let totalEnrollments = 0;
  let activeEnrollments = 0;

  const enrollmentPromises = items.map(async (c) => {
    try {
      const enrollments = await enrollmentApi.listByCadence(c.id);
      totalEnrollments += enrollments.length;
      activeEnrollments += enrollments.filter((e) => e.status === 'ACTIVE').length;
    } catch {
      // skip failures
    }
  });

  await Promise.all(enrollmentPromises);

  return {
    totalCadences: total,
    activeCadences,
    totalEnrollments,
    activeEnrollments,
  };
}