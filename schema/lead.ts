// Lead module — TypeScript types
// Mirrors prisma/schema.prisma Lead + LeadActivity models

import type { LeadStatus, ActivityType } from '@prisma/client';
export type { LeadStatus, ActivityType };

// ── Lead ────────────────────────────────────────────────

export interface LeadData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
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
