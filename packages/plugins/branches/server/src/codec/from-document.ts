import { castArray } from 'lodash/fp';

import { getModel, getSnapshotAttributeNames, isToOneRelation } from './attributes';

import type { LooseAttribute, LooseSchema, MediaRef, RelRef, Snapshot } from './types';

const toMediaRef = (value: unknown): MediaRef | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'object') {
    const id = (value as { id?: number | string }).id;
    return id === undefined || id === null ? null : { id };
  }
  return { id: value as number | string };
};

const toRelRef = (value: unknown): RelRef | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const { documentId, locale } = value as { documentId?: string; locale?: string | null };
  if (!documentId) {
    return null;
  }
  return { documentId, locale: locale ?? null };
};

const toScalar = (value: unknown): unknown => {
  if (value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
};

/**
 * Snapshot of one component instance as read from the database (row shape:
 * scalar columns + populated relations/media/nested components). Keeps `id`.
 */
const componentFromRow = (componentUid: string, row: Record<string, unknown>): Snapshot => {
  const schema = getModel(componentUid);
  const snapshot: Snapshot = {};
  if (row.id !== undefined && row.id !== null) {
    snapshot.id = row.id;
  }
  Object.assign(snapshot, snapshotFromRow(schema, row));
  return snapshot;
};

const valueFromRow = (attribute: LooseAttribute, value: unknown): unknown => {
  switch (attribute.type) {
    case 'media':
      return attribute.multiple
        ? castArray(value ?? [])
            .map(toMediaRef)
            .filter((ref): ref is MediaRef => ref !== null)
        : toMediaRef(Array.isArray(value) ? value[0] : value);
    case 'relation':
      return isToOneRelation(attribute)
        ? toRelRef(Array.isArray(value) ? value[0] : value)
        : castArray(value ?? [])
            .map(toRelRef)
            .filter((ref): ref is RelRef => ref !== null);
    case 'component':
      if (attribute.repeatable) {
        return castArray(value ?? [])
          .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
          .map((item) => componentFromRow(attribute.component as string, item));
      }
      return value && typeof value === 'object'
        ? componentFromRow(attribute.component as string, value as Record<string, unknown>)
        : null;
    case 'dynamiczone':
      return castArray(value ?? [])
        .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
        .map((item) => ({
          __component: item.__component as string,
          ...componentFromRow(item.__component as string, item),
        }));
    default:
      return toScalar(value);
  }
};

/**
 * Converts a row (content type or component) read with `getSnapshotPopulate`
 * into snapshot format. Attributes absent from the row are left out.
 */
export const snapshotFromRow = (schema: LooseSchema, row: Record<string, unknown>): Snapshot => {
  const snapshot: Snapshot = {};
  for (const name of getSnapshotAttributeNames(schema)) {
    if (!(name in row)) {
      continue;
    }
    snapshot[name] = valueFromRow(schema.attributes[name], row[name]);
  }
  return snapshot;
};

export const fromDocument = (uid: string, row: Record<string, unknown>): Snapshot =>
  snapshotFromRow(getModel(uid), row);
