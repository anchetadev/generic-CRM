// Phase B: Cadence Engine — TypeScript types
// Mirrors schema/cadence.sql

export interface CadenceSequence {
  id: string;
  name: string;
  description: string | null;
  targetType: 'contact' | 'lead';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CadenceChannel = 'email' | 'call' | 'sms' | 'linkedin' | 'manual';
export type CadenceActionType = 'send_message' | 'make_call' | 'send_sms' | 'manual_task';
export type CadenceWaitType = 'calendar' | 'business_hours';
export type CadenceExecutionStatus = 'active' | 'paused' | 'completed' | 'cancelled';
export type CadenceTaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface CadenceStepCondition {
  field: string;
  op: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value: string | number | boolean;
}

export interface CadenceStep {
  id: string;
  sequenceId: string;
  stepNumber: number;
  channel: CadenceChannel;
  actionType: CadenceActionType;
  subjectTemplate: string | null;
  bodyTemplate: string | null;
  waitDurationMinutes: number;
  waitType: CadenceWaitType;
  condition: CadenceStepCondition | null;
  createdAt: string;
  updatedAt: string;
}

export interface CadenceExecution {
  id: string;
  sequenceId: string;
  contactId: string;
  assignedRepId: string;
  currentStepNumber: number;
  status: CadenceExecutionStatus;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CadenceTask {
  id: string;
  executionId: string;
  stepId: string;
  contactId: string;
  assignedRepId: string;
  dueDate: string;
  status: CadenceTaskStatus;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// Computed / joined types ------------------------------------------------

export interface CadenceOverdueTask extends CadenceTask {
  contactName: string;
  sequenceName: string;
  hoursOverdue: number;
}

export interface CeoDailyCadenceRow {
  assignedRepId: string;
  day: string;
  activeExecutions: number;
  completedExecutions: number;
  tasksCompletedToday: number;
  overdueTasks: number;
}

// Cadence runner state machine transitions --------------------------------

export const CADENCE_EXECUTION_TRANSITIONS: Record<CadenceExecutionStatus, CadenceExecutionStatus[]> = {
  active:    ['paused', 'completed', 'cancelled'],
  paused:    ['active', 'cancelled'],
  completed: [],
  cancelled: [],
};

export const CADENCE_TASK_TRANSITIONS: Record<CadenceTaskStatus, CadenceTaskStatus[]> = {
  pending:      ['in_progress', 'skipped'],
  in_progress:  ['completed', 'skipped'],
  completed:    [],
  skipped:      [],
};