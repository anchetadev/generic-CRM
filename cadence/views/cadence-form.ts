// Cadence create/edit form helper — validation, defaults, and wiring to cadence/api/cadences.ts.

import * as cadenceApi from '../api/cadences';
import type {
  CreateCadenceInput,
  CreateStepInput,
  UpdateCadenceInput,
  UpsertStepInput,
} from '../api/cadences';
import type { CadenceChannel } from '@prisma/client';

// Re-export the input types for form consumers
export type {
  CreateCadenceInput,
  CreateStepInput,
  UpdateCadenceInput,
  UpsertStepInput,
};

// ── Validation ──────────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
}

export function validateCadenceInput(
  input: CreateCadenceInput,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.name || input.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required' });
  }

  if (!input.steps || input.steps.length === 0) {
    errors.push({ field: 'steps', message: 'At least one step is required' });
  } else {
    input.steps.forEach((step, i) => {
      if (!step.name || step.name.trim().length === 0) {
        errors.push({ field: `steps[${i}].name`, message: 'Step name is required' });
      }
      if (!step.bodyTemplate || step.bodyTemplate.trim().length === 0) {
        errors.push({
          field: `steps[${i}].bodyTemplate`,
          message: 'Step body template is required',
        });
      }
      if (step.delayMinutes < 0) {
        errors.push({
          field: `steps[${i}].delayMinutes`,
          message: 'Delay must be 0 or greater',
        });
      }
    });
  }

  return errors;
}

export function validateUpdateInput(
  input: UpdateCadenceInput,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (input.name !== undefined && input.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name cannot be empty' });
  }

  if (input.steps) {
    input.steps.forEach((step, i) => {
      if (!step.name || step.name.trim().length === 0) {
        errors.push({ field: `steps[${i}].name`, message: 'Step name is required' });
      }
      if (!step.bodyTemplate || step.bodyTemplate.trim().length === 0) {
        errors.push({
          field: `steps[${i}].bodyTemplate`,
          message: 'Step body template is required',
        });
      }
      if (step.delayMinutes < 0) {
        errors.push({
          field: `steps[${i}].delayMinutes`,
          message: 'Delay must be 0 or greater',
        });
      }
    });
  }

  return errors;
}

// ── Form operations ─────────────────────────────────────

/** Create a cadence from form input. */
export async function submitCreateCadence(
  input: CreateCadenceInput,
) {
  const errors = validateCadenceInput(input);
  if (errors.length > 0) {
    return { success: false as const, errors };
  }

  const cadence = await cadenceApi.createCadence(input);
  return { success: true as const, cadence };
}

/** Update a cadence from form input. */
export async function submitUpdateCadence(
  id: string,
  input: UpdateCadenceInput,
) {
  const errors = validateUpdateInput(input);
  if (errors.length > 0) {
    return { success: false as const, errors };
  }

  const cadence = await cadenceApi.updateCadence(id, input);
  return { success: true as const, cadence };
}

/** Deactivate a cadence. */
export async function submitDeactivateCadence(id: string) {
  const cadence = await cadenceApi.deactivateCadence(id);
  return { success: true as const, cadence };
}

// ── Step form helpers ───────────────────────────────────

const CHANNELS: CadenceChannel[] = ['EMAIL', 'CALL', 'SMS', 'LINKEDIN'];

export function getChannelOptions(): { value: CadenceChannel; label: string }[] {
  return CHANNELS.map((ch) => ({ value: ch, label: ch }));
}

/** Build a blank step for form initialization. */
export function blankStep(sortOrder: number): CreateStepInput {
  return {
    sortOrder,
    name: '',
    delayMinutes: 1440, // default 1 day
    channel: 'EMAIL',
    bodyTemplate: '',
  };
}

/** Build blank cadence input for form initialization. */
export function blankCadenceInput(): CreateCadenceInput {
  return {
    name: '',
    description: '',
    steps: [blankStep(1)],
  };
}

/** Reorder steps after drag/drop. Normalizes sortOrder values. */
export function reorderSteps(
  steps: CreateStepInput[] | UpsertStepInput[],
  fromIndex: number,
  toIndex: number,
): CreateStepInput[] | UpsertStepInput[] {
  const result = [...steps];
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result.map((step, i) => ({ ...step, sortOrder: i + 1 }));
}