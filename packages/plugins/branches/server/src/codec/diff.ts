import { castArray, isEqual } from 'lodash/fp';

import { getModel, getSnapshotAttributeNames } from './attributes';

import type { Conflict, LooseAttribute, LooseSchema, Snapshot } from './types';

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

/**
 * Per-attribute three-way merge of a branch delta onto its parent:
 *   base == branch          → nothing to apply
 *   base == parent          → take the branch value
 *   parent == branch        → both made the same change, nothing to apply
 *   otherwise               → conflict, the caller must pick a side
 */
export const threeWayMerge = (
  uid: string,
  parentCurrent: Snapshot,
  base: Snapshot,
  branch: Snapshot
): { merged: Snapshot; conflicts: Conflict[] } => {
  const schema = getModel(uid);
  const merged: Snapshot = {};
  const conflicts: Conflict[] = [];

  for (const name of Object.keys(branch)) {
    if (!(name in schema.attributes)) {
      continue;
    }
    const baseValue = base[name];
    const parentValue = parentCurrent[name];
    const branchValue = branch[name];

    if (isEqualValue(schema, name, baseValue, branchValue)) {
      continue;
    }
    if (isEqualValue(schema, name, baseValue, parentValue)) {
      merged[name] = branchValue;
      continue;
    }
    if (isEqualValue(schema, name, parentValue, branchValue)) {
      continue;
    }
    conflicts.push({ attribute: name, base: baseValue, parent: parentValue, branch: branchValue });
  }

  return { merged, conflicts };
};
