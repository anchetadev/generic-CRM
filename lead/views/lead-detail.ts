// Lead detail view — full lead with activities and summary stats.
// Wires to lead/api/leads.ts.

import * as leadApi from '../api/leads';
import type {
  LeadData,
  LeadWithActivities,
  LeadActivityData,
  LeadStatus,
} from '../../schema/lead';
import { LEAD_STATUS_TRANSITIONS } from '../../schema/lead';

// ── Detail result ──────────────────────────────────────

export interface LeadDetailView {
  lead: LeadWithActivities;
  activitySummary: ActivitySummary;
  allowedTransitions: LeadStatus[];
}

export interface ActivitySummary {
  total: number;
  byType: Record<string, number>;
  lastActivityAt: Date | null;
}

// ── Fetch full detail ───────────────────────────────────

export async function getLeadDetail(id: string): Promise<LeadDetailView | null> {
  const lead = await leadApi.getLeadWithActivities(id);
  if (!lead) return null;

  return {
    lead,
    activitySummary: summarizeActivities(lead.activities),
    allowedTransitions: LEAD_STATUS_TRANSITIONS[lead.status] ?? [],
  };
}

// ── Activity timeline ───────────────────────────────────

export interface ActivityTimelineEntry {
  id: string;
  type: string;
  subject: string | null;
  body: string | null;
  createdAt: Date;
  relativeTime: string;
}

export function buildTimeline(activities: LeadActivityData[]): ActivityTimelineEntry[] {
  const now = Date.now();
  return activities.map((a) => ({
    id: a.id,
    type: a.type,
    subject: a.subject,
    body: a.body,
    createdAt: a.createdAt,
    relativeTime: formatRelativeTime(now - a.createdAt.getTime()),
  }));
}

// ── Helpers ─────────────────────────────────────────────

function summarizeActivities(activities: LeadActivityData[]): ActivitySummary {
  const byType: Record<string, number> = {};
  let lastActivityAt: Date | null = null;

  for (const a of activities) {
    byType[a.type] = (byType[a.type] ?? 0) + 1;
    if (!lastActivityAt || a.createdAt > lastActivityAt) {
      lastActivityAt = a.createdAt;
    }
  }

  return { total: activities.length, byType, lastActivityAt };
}

function formatRelativeTime(msDiff: number): string {
  const seconds = Math.floor(msDiff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
