// Lead create/edit form helper — validation, defaults, and wiring to lead/api/leads.ts.

import * as leadApi from '../api/leads';
import type { LeadData, LeadStatus, LeadSource, LeadSourceDetail } from '../../schema/lead';
import type { ActivityType } from '@prisma/client';

// Re-export input types for form consumers
export type { CreateLeadInput, UpdateLeadInput } from '../api/leads';

// ── Validation ──────────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
}

export interface FormErrorResult {
  success: false;
  errors: ValidationError[];
}

export interface FormApiErrorResult {
  success: false;
  error: string;
}

export type FormResult<T> =
  | { success: true; data: T }
  | FormErrorResult
  | FormApiErrorResult;

export function validateCreateInput(input: {
  name: string;
  email?: string;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.name || input.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required' });
  }

  if (input.email && !input.email.includes('@')) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }

  return errors;
}

export function validateUpdateInput(input: {
  name?: string;
  email?: string;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  if (input.name !== undefined && input.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name cannot be empty' });
  }

  if (input.email !== undefined && input.email !== '' && !input.email.includes('@')) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }

  return errors;
}

// ── Form operations ─────────────────────────────────────

/** Create a lead from form input. */
export async function submitCreateLead(
  input: leadApi.CreateLeadInput,
): Promise<FormResult<LeadData>> {
  const errors = validateCreateInput(input);
  if (errors.length > 0) {
    return { success: false, errors };
  }

  try {
    const lead = await leadApi.createLead(input);
    return { success: true, data: lead };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Create lead failed' };
  }
}

/** Update a lead from form input. */
export async function submitUpdateLead(
  id: string,
  input: leadApi.UpdateLeadInput,
): Promise<FormResult<LeadData>> {
  const errors = validateUpdateInput(input);
  if (errors.length > 0) {
    return { success: false, errors };
  }

  try {
    const lead = await leadApi.updateLead(id, input);
    return { success: true, data: lead };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Update lead failed' };
  }
}

/** Update lead status. */
export async function submitStatusChange(
  id: string,
  status: LeadStatus,
): Promise<FormResult<LeadData>> {
  try {
    const lead = await leadApi.updateStatus(id, status);
    return { success: true, data: lead };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Status update failed' };
  }
}

/** Delete a lead. */
export async function submitDeleteLead(
  id: string,
): Promise<FormResult<void>> {
  try {
    await leadApi.deleteLead(id);
    return { success: true, data: undefined };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Delete failed' };
  }
}

/** Add an activity to a lead. */
export async function submitAddActivity(
  leadId: string,
  input: { type: ActivityType; subject?: string; body?: string },
): Promise<FormResult<leadApi.LeadWithActivities>> {
  try {
    const lead = await leadApi.addActivity(leadId, input);
    return { success: true, data: lead };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Add activity failed' };
  }
}

/** Set or clear a follow-up date on a lead. Triggers cadence task creation. */
export async function submitSetFollowUp(
  leadId: string,
  followUpAt: Date | null,
  assigneeId?: string,
): Promise<FormResult<leadApi.LeadData>> {
  try {
    const lead = await leadApi.setFollowUp(leadId, followUpAt, assigneeId);
    return { success: true, data: lead };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Set follow-up failed' };
  }
}

// ── Form helpers ────────────────────────────────────────

const LEAD_STATUSES: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'DISQUALIFIED', 'CONVERTED'];

export function getStatusOptions(): { value: LeadStatus; label: string }[] {
  return LEAD_STATUSES.map((s) => ({
    value: s,
    label: s.charAt(0) + s.slice(1).toLowerCase(),
  }));
}

const ACTIVITY_TYPES: ActivityType[] = ['NOTE', 'EMAIL', 'CALL', 'MEETING', 'TASK'];

export function getActivityTypeOptions(): { value: ActivityType; label: string }[] {
  return ACTIVITY_TYPES.map((t) => ({
    value: t,
    label: t.charAt(0) + t.slice(1).toLowerCase(),
  }));
}

/** Build blank lead input for form initialization. */
export function blankLeadInput(): leadApi.CreateLeadInput {
  return {
    name: '',
    email: '',
    phone: '',
    company: '',
    notes: '',
  };
}

// ── Lead Source helpers ─────────────────────────────────

const LEAD_SOURCES: LeadSource[] = ['REFERRAL', 'INBOUND', 'OUTBOUND'];

export function getLeadSourceOptions(): { value: LeadSource; label: string }[] {
  return LEAD_SOURCES.map((s) => ({
    value: s,
    label: s.charAt(0) + s.slice(1).toLowerCase(),
  }));
}

const LEAD_SOURCE_DETAILS: LeadSourceDetail[] = [
  'WARN_TRIGGER',
  'LINKEDIN_ICP_MATCH',
  'REFERRAL_INTRODUCTION',
  'WORD_OF_MOUTH',
  'SILENT_REFERRAL',
  'EVENT',
  'WEBSITE_CONTENT',
  'OTHER',
];

const LEAD_SOURCE_DETAIL_LABELS: Record<LeadSourceDetail, string> = {
  WARN_TRIGGER: 'WARN Trigger',
  LINKEDIN_ICP_MATCH: 'LinkedIn ICP Match',
  REFERRAL_INTRODUCTION: 'Referral Introduction',
  WORD_OF_MOUTH: 'Word of Mouth',
  SILENT_REFERRAL: 'Silent Referral',
  EVENT: 'Event',
  WEBSITE_CONTENT: 'Website/Content',
  OTHER: 'Other',
};

export function getLeadSourceDetailOptions(): { value: LeadSourceDetail; label: string }[] {
  return LEAD_SOURCE_DETAILS.map((d) => ({
    value: d,
    label: LEAD_SOURCE_DETAIL_LABELS[d],
  }));
}
