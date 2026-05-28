// Lead list view — display all leads with status counts and activity summaries.
// Wires to lead/api/leads.ts.

import * as leadApi from '../api/leads';
import type { LeadData, LeadStatus } from '../../schema/lead';

// ── Row types ───────────────────────────────────────────

export interface LeadListRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  status: LeadStatus;
  ownerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadListResult {
  items: LeadListRow[];
  total: number;
  byStatus: Record<LeadStatus, number>;
}

// ── List all leads ──────────────────────────────────────

export async function listLeadsView(
  params?: {
    status?: LeadStatus;
    ownerId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  },
): Promise<LeadListResult> {
  const { items, total } = await leadApi.listLeads(params);

  // Count by status for dashboard summary
  const byStatus: Record<LeadStatus, number> = {
    NEW: 0,
    CONTACTED: 0,
    QUALIFIED: 0,
    DISQUALIFIED: 0,
    CONVERTED: 0,
  };

  // If filtering by status, we need full count for byStatus
  if (params?.status) {
    const allStatuses: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'DISQUALIFIED', 'CONVERTED'];
    const counts = await Promise.all(
      allStatuses.map(async (s) => {
        const result = await leadApi.listLeads({ ...params, status: s, limit: 0, offset: 0 });
        return [s, result.total] as const;
      }),
    );
    for (const [s, count] of counts) {
      byStatus[s] = count;
    }
  } else {
    for (const lead of items) {
      byStatus[lead.status]++;
    }
    // If we have more items than fit on one page, the byStatus counts are partial.
    // For accurate counts, re-query without limit.
    if (total > (params?.limit ?? Infinity)) {
      const allStatuses: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'DISQUALIFIED', 'CONVERTED'];
      const counts = await Promise.all(
        allStatuses.map(async (s) => {
          const result = await leadApi.listLeads({ ...params, status: s, limit: 0, offset: 0 });
          return [s, result.total] as const;
        }),
      );
      for (const [s, count] of counts) {
        byStatus[s] = count;
      }
    }
  }

  return {
    items: items.map(toListRow),
    total,
    byStatus,
  };
}

// ── Pipeline view (leads grouped by status) ─────────────

export interface PipelineColumn {
  status: LeadStatus;
  label: string;
  count: number;
  leads: LeadListRow[];
}

export async function getLeadPipeline(
  ownerId?: string,
  limitPerColumn: number = 50,
): Promise<PipelineColumn[]> {
  const statuses: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'DISQUALIFIED', 'CONVERTED'];
  const columns: PipelineColumn[] = [];

  for (const status of statuses) {
    const { items, total } = await leadApi.listLeads({
      status,
      ownerId,
      limit: limitPerColumn,
    });

    columns.push({
      status,
      label: status.charAt(0) + status.slice(1).toLowerCase(),
      count: total,
      leads: items.map(toListRow),
    });
  }

  return columns;
}

// ── Helpers ─────────────────────────────────────────────

function toListRow(lead: LeadData): LeadListRow {
  return {
    id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    source: lead.source,
    status: lead.status,
    ownerId: lead.ownerId,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}
