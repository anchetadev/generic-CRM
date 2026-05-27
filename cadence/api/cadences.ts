// Cadence CRUD — create, read, list, update, deactivate cadences with steps.
// Steps are managed as an ordered list within a cadence.

import { prisma } from '../lib/prisma';
import type { CadenceWithSteps, CadenceStepData } from '../../schema/cadence';
import type { Prisma, CadenceChannel } from '@prisma/client';

// ── Types ───────────────────────────────────────────────

export interface CreateCadenceInput {
  name: string;
  description?: string;
  steps: CreateStepInput[];
}

export interface CreateStepInput {
  sortOrder: number;
  name: string;
  delayMinutes: number;
  channel: CadenceChannel;
  subject?: string;
  bodyTemplate: string;
}

export interface UpdateCadenceInput {
  name?: string;
  description?: string;
  isActive?: boolean;
  steps?: UpsertStepInput[];
}

export interface UpsertStepInput {
  id?: string;          // if provided, update existing; otherwise create new
  sortOrder: number;
  name: string;
  delayMinutes: number;
  channel: CadenceChannel;
  subject?: string;
  bodyTemplate: string;
}

// ── Create ──────────────────────────────────────────────

export async function createCadence(input: CreateCadenceInput): Promise<CadenceWithSteps> {
  return prisma.$transaction(async (tx) => {
    const cadence = await tx.cadence.create({
      data: {
        name: input.name,
        description: input.description,
        steps: {
          create: input.steps.map((s) => ({
            sortOrder: s.sortOrder,
            name: s.name,
            delayMinutes: s.delayMinutes,
            channel: s.channel,
            subject: s.subject,
            bodyTemplate: s.bodyTemplate,
          })),
        },
      },
      include: { steps: { orderBy: { sortOrder: 'asc' } } },
    });

    return toCadenceWithSteps(cadence);
  });
}

// ── Read ────────────────────────────────────────────────

export async function getCadence(id: string): Promise<CadenceWithSteps | null> {
  const cadence = await prisma.cadence.findUnique({
    where: { id },
    include: { steps: { orderBy: { sortOrder: 'asc' } } },
  });

  return cadence ? toCadenceWithSteps(cadence) : null;
}

// ── List ────────────────────────────────────────────────

export interface ListCadencesParams {
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export async function listCadences(
  params: ListCadencesParams = {},
): Promise<{ items: CadenceWithSteps[]; total: number }> {
  const where: Prisma.CadenceWhereInput = {};
  if (params.isActive !== undefined) {
    where.isActive = params.isActive;
  }

  const [items, total] = await Promise.all([
    prisma.cadence.findMany({
      where,
      include: { steps: { orderBy: { sortOrder: 'asc' } } },
      take: params.limit,
      skip: params.offset,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.cadence.count({ where }),
  ]);

  return {
    items: items.map(toCadenceWithSteps),
    total,
  };
}

// ── Update (with steps upsert) ──────────────────────────

export async function updateCadence(
  id: string,
  input: UpdateCadenceInput,
): Promise<CadenceWithSteps> {
  return prisma.$transaction(async (tx) => {
    // Update cadence fields
    await tx.cadence.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        isActive: input.isActive,
      },
    });

    // Replace steps if provided
    if (input.steps) {
      // Delete removed steps
      await tx.cadenceStep.deleteMany({ where: { cadenceId: id } });

      // Create new set
      await tx.cadenceStep.createMany({
        data: input.steps.map((s) => ({
          cadenceId: id,
          sortOrder: s.sortOrder,
          name: s.name,
          delayMinutes: s.delayMinutes,
          channel: s.channel,
          subject: s.subject,
          bodyTemplate: s.bodyTemplate,
        })),
      });
    }

    const updated = await tx.cadence.findUniqueOrThrow({
      where: { id },
      include: { steps: { orderBy: { sortOrder: 'asc' } } },
    });

    return toCadenceWithSteps(updated);
  });
}

// ── Deactivate ──────────────────────────────────────────

export async function deactivateCadence(id: string): Promise<CadenceWithSteps> {
  const cadence = await prisma.cadence.update({
    where: { id },
    data: { isActive: false },
    include: { steps: { orderBy: { sortOrder: 'asc' } } },
  });

  return toCadenceWithSteps(cadence);
}

// ── Helpers ─────────────────────────────────────────────

function toCadenceWithSteps(cadence: any): CadenceWithSteps {
  return {
    id: cadence.id,
    name: cadence.name,
    description: cadence.description,
    isActive: cadence.isActive,
    createdAt: cadence.createdAt,
    updatedAt: cadence.updatedAt,
    steps: cadence.steps.map(toStepData),
  };
}

function toStepData(step: any): CadenceStepData {
  return {
    id: step.id,
    cadenceId: step.cadenceId,
    sortOrder: step.sortOrder,
    name: step.name,
    delayMinutes: step.delayMinutes,
    channel: step.channel,
    subject: step.subject,
    bodyTemplate: step.bodyTemplate,
  };
}