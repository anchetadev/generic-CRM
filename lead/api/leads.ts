// Lead CRUD — create, read, list, update, status transitions.
// Bridges leads to the cadence engine via contactId + followUpAt.

import { prisma } from '../lib/prisma';
import type { LeadData, LeadWithActivities, LeadStatus, ActivityType, LeadSource, LeadSourceDetail } from '../../schema/lead';
import { LEAD_SOURCE_DETAIL_TO_SOURCE } from '../../schema/lead';
import type { Prisma } from '@prisma/client';
export type { LeadData, LeadWithActivities, LeadStatus, ActivityType, LeadSource, LeadSourceDetail } from '../../schema/lead';

// ── Types ───────────────────────────────────────────────

export interface CreateLeadInput {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  leadSource?: LeadSource;
  leadSourceDetail?: LeadSourceDetail;
  ownerId?: string;
  contactId?: string;
  followUpAt?: Date;
  notes?: string;
}

export interface UpdateLeadInput {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  leadSource?: LeadSource | null;
  leadSourceDetail?: LeadSourceDetail | null;
  ownerId?: string | null;
  contactId?: string | null;
  followUpAt?: Date | null;
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

/** Derive leadSource from leadSourceDetail if not explicitly set. */
function autoPopulateSource(
  leadSource: LeadSource | undefined,
  leadSourceDetail: LeadSourceDetail | undefined,
): LeadSource | undefined {
  if (leadSource || !leadSourceDetail) return leadSource;
  return LEAD_SOURCE_DETAIL_TO_SOURCE[leadSourceDetail] ?? undefined;
}

export async function createLead(input: CreateLeadInput): Promise<LeadData> {
  const resolvedSource = autoPopulateSource(input.leadSource, input.leadSourceDetail);
  const lead = await prisma.lead.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      company: input.company,
      leadSource: resolvedSource,
      leadSourceDetail: input.leadSourceDetail,
      ownerId: input.ownerId,
      contactId: input.contactId,
      followUpAt: input.followUpAt,
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
  // If detail changed, auto-populate source unless explicitly provided
  let resolvedSource = input.leadSource;
  if (input.leadSourceDetail !== undefined && input.leadSource === undefined) {
    const current = await prisma.lead.findUniqueOrThrow({ where: { id } });
    resolvedSource = autoPopulateSource(
      current.leadSource ?? undefined,
      input.leadSourceDetail ?? undefined,
    );
  }

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      company: input.company,
      leadSource: resolvedSource,
      leadSourceDetail: input.leadSourceDetail,
      ownerId: input.ownerId,
      contactId: input.contactId,
      followUpAt: input.followUpAt,
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

// ── Follow-up sync ──────────────────────────────────────

/** Set or clear a follow-up date on a lead. When setting, ensures a Contact
 *  exists and creates a cadence task so the cadence engine picks it up. */
export async function setFollowUp(
  leadId: string,
  followUpAt: Date | null,
  assigneeId?: string,
): Promise<LeadData> {
  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findUniqueOrThrow({
      where: { id: leadId },
      include: { contact: true },
    });

    if (!followUpAt) {
      // Clearing the follow-up — just null it out
      const updated = await tx.lead.update({
        where: { id: leadId },
        data: { followUpAt: null },
      });
      return toLeadData(updated);
    }

    // Ensure a Contact exists for this lead
    let contactId = lead.contactId;
    if (!contactId) {
      // Create a contact from the lead data, or link to existing by email
      let contact = lead.email
        ? await tx.contact.findUnique({ where: { email: lead.email } })
        : null;

      if (!contact) {
        contact = await tx.contact.create({
          data: {
            name: lead.name,
            email: lead.email ?? `${lead.id}@placeholder.local`,
            phone: lead.phone,
            company: lead.company,
          },
        });
      }

      contactId = contact.id;
      await tx.lead.update({
        where: { id: leadId },
        data: { contactId },
      });
    }

    // Find or create a default cadence for follow-up tasks
    let cadence = await tx.cadence.findFirst({
      where: { name: 'Lead Follow-Up' },
    });

    if (!cadence) {
      cadence = await tx.cadence.create({
        data: {
          name: 'Lead Follow-Up',
          description: 'Auto-generated cadence for lead follow-up dates',
          isActive: true,
        },
      });

      await tx.cadenceStep.create({
        data: {
          cadenceId: cadence.id,
          sortOrder: 1,
          name: 'Follow up with lead',
          delayMinutes: 0,
          channel: 'EMAIL',
          bodyTemplate: 'Follow up with {{contact.name}} regarding {{contact.company}}.',
        },
      });
    }

    // Get the first step
    const step = await tx.cadenceStep.findFirstOrThrow({
      where: { cadenceId: cadence.id },
      orderBy: { sortOrder: 'asc' },
    });

    // Enroll the contact in the follow-up cadence (idempotent)
    let enrollment = await tx.cadenceEnrollment.findUnique({
      where: { cadenceId_contactId: { cadenceId: cadence.id, contactId } },
    });

    if (!enrollment) {
      enrollment = await tx.cadenceEnrollment.create({
        data: {
          cadenceId: cadence.id,
          contactId,
          currentStepId: step.id,
          status: 'ACTIVE',
        },
      });
    }

    // Check if there's already an incomplete follow-up task for this lead
    const existingTask = await tx.cadenceTask.findFirst({
      where: {
        leadId,
        completedAt: null,
      },
    });

    if (existingTask) {
      // Update the existing task's due date
      await tx.cadenceTask.update({
        where: { id: existingTask.id },
        data: { dueAt: followUpAt },
      });
    } else {
      // Create a new cadence task linked to the lead
      await tx.cadenceTask.create({
        data: {
          enrollmentId: enrollment.id,
          stepId: step.id,
          assigneeId: assigneeId ?? lead.ownerId,
          leadId,
          title: `Follow up: ${lead.name}`,
          body: `Follow up with ${lead.name}${lead.company ? ` at ${lead.company}` : ''}.`,
          channel: 'EMAIL',
          dueAt: followUpAt,
        },
      });
    }

    // Update the lead's followUpAt
    const updated = await tx.lead.update({
      where: { id: leadId },
      data: { followUpAt, contactId },
    });

    return toLeadData(updated);
  });
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
    leadSource: lead.leadSource ?? null,
    leadSourceDetail: lead.leadSourceDetail ?? null,
    status: lead.status,
    ownerId: lead.ownerId,
    contactId: lead.contactId ?? null,
    followUpAt: lead.followUpAt ?? null,
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
