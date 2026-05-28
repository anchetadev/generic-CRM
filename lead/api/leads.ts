// Lead CRUD — create, read, list, update, status transitions.

import { prisma } from '../lib/prisma';
import type { LeadData, LeadWithActivities, LeadStatus, ActivityType } from '../../schema/lead';

// ── Types ───────────────────────────────────────────────

export interface CreateLeadInput {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  ownerId?: string;
  notes?: string;
}

export interface UpdateLeadInput {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  ownerId?: string | null;
  notes?: string;
}

export interface ListLeadsParams {
  status?: LeadStatus;
  ownerId?: string;
  search?: string; // matches name, email, company
  limit?: number;
  offset?: number;
}

// ── Create ──────────────────────────────────────────────

export async function createLead(input: CreateLeadInput): Promise<LeadData> {
  const lead = await prisma.lead.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      company: input.company,
      source: input.source,
      ownerId: input.ownerId,
      notes: input.notes,
    },
  });

  return toLeadData(lead);
}

// ── Read ────────────────────────────────────────────────

export async function getLead(id: string): Promise<LeadData | null> {
  const lead = await prisma.lead.findUnique({ where: { id } });
  return lead ? toLeadData(lead) : null;
}

export async function getLeadWithActivities(id: string): Promise<LeadWithActivities | null> {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { activities: { orderBy: { createdAt: 'desc' } } },
  });
  return lead ? toLeadWithActivities(lead) : null;
}

// ── List ────────────────────────────────────────────────

export async function listLeads(
  params: ListLeadsParams = {},
): Promise<{ items: LeadData[]; total: number }> {
  const where: Prisma.LeadWhereInput = {};

  if (params.status) {
    where.status = params.status;
  }
  if (params.ownerId) {
    where.ownerId = params.ownerId;
  }
  if (params.search) {
    const term = params.search;
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } },
      { company: { contains: term, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      take: params.limit,
      skip: params.offset,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.lead.count({ where }),
  ]);

  return { items: items.map(toLeadData), total };
}

// ── Update ──────────────────────────────────────────────

export async function updateLead(id: string, input: UpdateLeadInput): Promise<LeadData> {
  const lead = await prisma.lead.update({
    where: { id },
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      company: input.company,
      source: input.source,
      ownerId: input.ownerId,
      notes: input.notes,
    },
  });

  return toLeadData(lead);
}

// ── Status transitions ──────────────────────────────────

export async function updateStatus(id: string, status: LeadStatus): Promise<LeadData> {
  const lead = await prisma.lead.update({
    where: { id },
    data: { status },
  });
  return toLeadData(lead);
}

// ── Assign owner ────────────────────────────────────────

export async function assignOwner(id: string, ownerId: string | null): Promise<LeadData> {
  const lead = await prisma.lead.update({
    where: { id },
    data: { ownerId },
  });
  return toLeadData(lead);
}

// ── Delete ──────────────────────────────────────────────

export async function deleteLead(id: string): Promise<void> {
  await prisma.lead.delete({ where: { id } });
}

// ── Activities ──────────────────────────────────────────

export interface CreateActivityInput {
  type: ActivityType;
  subject?: string;
  body?: string;
}

export async function addActivity(
  leadId: string,
  input: CreateActivityInput,
): Promise<LeadWithActivities> {
  await prisma.leadActivity.create({
    data: {
      leadId,
      type: input.type,
      subject: input.subject,
      body: input.body,
    },
  });

  // Return updated lead with all activities
  const lead = await prisma.lead.findUniqueOrThrow({
    where: { id: leadId },
    include: { activities: { orderBy: { createdAt: 'desc' } } },
  });

  return toLeadWithActivities(lead);
}

// ── Helpers ─────────────────────────────────────────────

function toLeadData(lead: any): LeadData {
  return {
    id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    source: lead.source,
    status: lead.status,
    ownerId: lead.ownerId,
    notes: lead.notes,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}

function toLeadWithActivities(lead: any): LeadWithActivities {
  return {
    ...toLeadData(lead),
    activities: (lead.activities || []).map((a: any) => ({
      id: a.id,
      leadId: a.leadId,
      type: a.type,
      subject: a.subject,
      body: a.body,
      createdAt: a.createdAt,
    })),
  };
}
