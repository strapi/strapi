// Copied from packages/plugins/branches/server/src/codec/diff.ts — keep structurally
// in sync; extraction into a shared package is planned once both plugins are merged.
import { castArray, isEqual } from 'lodash/fp';

import { getModel, getSnapshotAttributeNames } from './attributes';

import type { LooseAttribute, LooseSchema, Snapshot } from './types';

const normalizeScalar = (value: unknown): unknown => {
  if (value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
};

const normalizeComponent = (componentUid: string, value: unknown): unknown => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const schema = getModel(componentUid);
  const record = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  if (typeof record.__component === 'string') {
    out.__component = record.__component;
  }
  for (const name of getSnapshotAttributeNames(schema)) {
    if (!(name in record)) {
      continue;
    }
    out[name] = normalizeValue(schema.attributes[name], record[name]);
  }
  return out;
};

/**
 * Value comparison form: component ids and volatile keys removed (a
 * re-created component is not a change), dates as ISO strings, `undefined`
 * as `null`, empty lists and `null` distinguished only where the schema does.
 */
const normalizeValue = (attribute: LooseAttribute, value: unknown): unknown => {
  switch (attribute.type) {
    case 'relation':
      return castArray(value ?? [])
        .filter(Boolean)
        .map((ref) => {
          const { documentId, locale } = ref as { documentId: string; locale?: string | null };
          return { documentId, locale: locale ?? null };
        });
    case 'media':
      return castArray(value ?? [])
        .filter(Boolean)
        .map((ref) => String((ref as { id: unknown }).id));
    case 'component':
      return attribute.repeatable
        ? castArray(value ?? []).map((item) =>
            normalizeComponent(attribute.component as string, item)
          )
        : normalizeComponent(attribute.component as string, value);
    case 'dynamiczone':
      return castArray(value ?? [])
        .filter((item) => !!item && typeof item === 'object')
        .map((item) => normalizeComponent((item as { __component: string }).__component, item));
    default:
      return normalizeScalar(value);
  }
};

export const isEqualValue = (
  schema: LooseSchema,
  name: string,
  a: unknown,
  b: unknown
): boolean => {
  const attribute = schema.attributes[name];
  if (!attribute) {
    return isEqual(a, b);
  }
  return isEqual(normalizeValue(attribute, a), normalizeValue(attribute, b));
};

/** Attributes of `next` whose value differs from `current` (both in snapshot format). */
export const diffSnapshots = (uid: string, current: Snapshot, next: Snapshot): string[] => {
  const schema = getModel(uid);
  return Object.keys(next).filter(
    (name) => name in schema.attributes && !isEqualValue(schema, name, current[name], next[name])
  );
};
