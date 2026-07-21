// Lead list view — display all leads with status counts and activity summaries.
// Wires to lead/api/leads.ts.

import * as leadApi from '../api/leads';
import { prisma } from '../lib/prisma';
import type { LeadData, LeadStatus } from '../../schema/lead';
import type { Prisma } from '@prisma/client';

// ── Row types ───────────────────────────────────────────

export interface LeadListRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  leadSource: string | null;
  leadSourceDetail: string | null;
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

  // Single groupBy query replaces the N+1 count pattern
  const where: Prisma.LeadWhereInput = {};
  if (params?.ownerId) where.ownerId = params.ownerId;
  if (params?.search) {
    const term = params.search;
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } },
      { company: { contains: term, mode: 'insensitive' } },
    ];
  }

  const grouped = await prisma.lead.groupBy({
    by: ['status'],
    where,
    _count: { _all: true },
  });

  const byStatus: Record<LeadStatus, number> = {
    NEW: 0,
    CONTACTED: 0,
    QUALIFIED: 0,
    DISQUALIFIED: 0,
    CONVERTED: 0,
  };
  for (const row of grouped) {
    byStatus[row.status] = row._count._all;
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
    leadSource: lead.leadSource,
    leadSourceDetail: lead.leadSourceDetail,
    status: lead.status,
    ownerId: lead.ownerId,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}
