// Template interpolation for cadence step body templates.
// Supports {{contact.name}}, {{contact.company}}, {{contact.email}}.

import type { Contact } from '@prisma/client';

export interface TemplateContext {
  contact: Pick<Contact, 'name' | 'email' | 'company' | 'phone'>;
}

const TEMPLATE_RE = /\{\{(\w+(?:\.\w+)*)\}\}/g;

export function interpolate(template: string, ctx: TemplateContext): string {
  return template.replace(TEMPLATE_RE, (_match, path: string) => {
    const value = resolvePath(ctx, path);
    return value != null ? String(value) : `{{${path}}}`;
  });
}

function resolvePath(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}