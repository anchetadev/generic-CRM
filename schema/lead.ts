// Lead module — TypeScript types
// Mirrors prisma/schema.prisma Lead + LeadActivity models

import type { LeadStatus, ActivityType, LeadSource, LeadSourceDetail } from '@prisma/client';
export type { LeadStatus, ActivityType, LeadSource, LeadSourceDetail };

// ── Lead source → detail mapping (for auto-populate) ────

export const LEAD_SOURCE_DETAIL_TO_SOURCE: Record<LeadSourceDetail, LeadSource | null> = {
  WARN_TRIGGER:           'OUTBOUND',
  LINKEDIN_ICP_MATCH:     'OUTBOUND',
  REFERRAL_INTRODUCTION:  'REFERRAL',
  WORD_OF_MOUTH:          'REFERRAL',
  SILENT_REFERRAL:        'REFERRAL',
  EVENT:                  'INBOUND',
  WEBSITE_CONTENT:        'INBOUND',
  OTHER:                  null,
};

// ── Lead ────────────────────────────────────────────────

export interface LeadData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  leadSource: LeadSource | null;
  leadSourceDetail: LeadSourceDetail | null;
  status: LeadStatus;
  ownerId: string | null;
  contactId: string | null;
  followUpAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadWithActivities extends LeadData {
  activities: LeadActivityData[];
}

// ── Activity ────────────────────────────────────────────

export interface LeadActivityData {
  id: string;
  leadId: string;
  type: ActivityType;
  subject: string | null;
  body: string | null;
  createdAt: Date;
}

// ── Status transitions ──────────────────────────────────

export const LEAD_STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW:         ['CONTACTED', 'DISQUALIFIED'],
  CONTACTED:   ['QUALIFIED', 'DISQUALIFIED'],
  QUALIFIED:   ['CONVERTED', 'DISQUALIFIED'],
  DISQUALIFIED: [],
  CONVERTED:   [],
};
