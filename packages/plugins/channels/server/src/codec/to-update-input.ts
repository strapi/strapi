// Copied from packages/plugins/branches/server/src/codec/to-update-input.ts — keep structurally
// in sync; extraction into a shared package is planned once both plugins are merged.
import { castArray } from 'lodash/fp';

import { hasDraftAndPublish, isLocalizedContentType } from '../utils';
import {
  getComponentIdPopulate,
  getModel,
  getSnapshotAttributeNames,
  isToOneRelation,
} from './attributes';

import type { LooseAttribute, LooseSchema, MediaRef, RelRef, Snapshot } from './types';

/**
 * Ids of every component row attached to an entry (`componentUid:id`), so a
 * delta may only update in place the rows the target entry really owns —
 * `deleteOldComponents` throws on foreign ids.
 */
export const collectAttachedComponentIds = async (
  uid: string,
  entryId: number | string
): Promise<Set<string>> => {
  const attached = new Set<string>();
  const row = await strapi.db.query(uid as never).findOne({
    where: { id: entryId },
    populate: getComponentIdPopulate(uid),
  });
  if (!row) {
    return attached;
  }

  const walk = (schema: LooseSchema, value: Record<string, unknown>) => {
    for (const [name, attribute] of Object.entries(schema.attributes)) {
      if (attribute.type === 'component') {
        const componentUid = attribute.component as string;
        for (const item of castArray(value[name] ?? [])) {
          if (item && typeof item === 'object') {
            const record = item as Record<string, unknown>;
            if (record.id != null) {
              attached.add(`${componentUid}:${record.id}`);
            }
            walk(getModel(componentUid), record);
          }
        }
      } else if (attribute.type === 'dynamiczone') {
        for (const item of castArray(value[name] ?? [])) {
          if (item && typeof item === 'object') {
            const record = item as Record<string, unknown>;
            const componentUid = record.__component as string | undefined;
            if (componentUid) {
              if (record.id != null) {
                attached.add(`${componentUid}:${record.id}`);
              }
              walk(getModel(componentUid), record);
            }
          }
        }
      }
    }
  };

  walk(getModel(uid), row);
  return attached;
};

/** Keeps only refs whose target draft still exists (the document service throws on missing targets). */
export const filterExistingTargets = async (
  targetUid: string,
  refs: RelRef[]
): Promise<RelRef[]> => {
  if (refs.length === 0) {
    return [];
  }
  const targetModel = getModel(targetUid);
  const targetLocalized = isLocalizedContentType(targetModel);
  const rows: Array<{ documentId: string; locale: string | null }> = await strapi.db
    .query(targetUid as never)
    .findMany({
      where: {
        documentId: { $in: [...new Set(refs.map((ref) => ref.documentId))] },
        ...(hasDraftAndPublish(targetModel) ? { publishedAt: null } : {}),
      },
      select: ['documentId', 'locale'],
    });
  const keys = new Set(
    rows.map((row) => (targetLocalized ? `${row.documentId}:${row.locale ?? ''}` : row.documentId))
  );
  return refs.filter((ref) =>
    keys.has(targetLocalized ? `${ref.documentId}:${ref.locale ?? ''}` : ref.documentId)
  );
};

interface ConvertContext {
  attached: Set<string>;
}

const relationToInput = async (attribute: LooseAttribute, value: unknown): Promise<unknown> => {
  const targetUid = attribute.target as string;
  const targetLocalized = isLocalizedContentType(getModel(targetUid));
  const refs = castArray((value as RelRef[] | RelRef | null) ?? []).filter(
    (ref): ref is RelRef => !!ref && typeof ref.documentId === 'string'
  );
  const existing = await filterExistingTargets(targetUid, refs);
  const items = existing.map((ref) => ({
    documentId: ref.documentId,
    ...(targetLocalized && ref.locale ? { locale: ref.locale } : {}),
  }));
  if (isToOneRelation(attribute)) {
    return items.length > 0 ? { set: [items[items.length - 1]] } : null;
  }
  return { set: items };
};

const mediaToInput = (attribute: LooseAttribute, value: unknown): unknown => {
  const refs = castArray((value as MediaRef[] | MediaRef | null) ?? []).filter(
    (ref): ref is MediaRef => !!ref && ref.id !== undefined && ref.id !== null
  );
  if (attribute.multiple) {
    return refs.map((ref) => ref.id);
  }
  return refs.length > 0 ? refs[refs.length - 1].id : null;
};

const componentToInput = async (
  componentUid: string,
  value: Snapshot,
  ctx: ConvertContext
): Promise<Record<string, unknown>> => {
  const schema = getModel(componentUid);
  const out: Record<string, unknown> = {};
  if (value.id != null && ctx.attached.has(`${componentUid}:${value.id}`)) {
    out.id = value.id;
  }
  for (const name of getSnapshotAttributeNames(schema)) {
    if (!(name in value)) {
      continue;
    }
    out[name] = await valueToInput(schema.attributes[name], value[name], ctx);
  }
  return out;
};

const valueToInput = async (
  attribute: LooseAttribute,
  value: unknown,
  ctx: ConvertContext
): Promise<unknown> => {
  switch (attribute.type) {
    case 'relation':
      return relationToInput(attribute, value);
    case 'media':
      return mediaToInput(attribute, value);
    case 'component': {
      const componentUid = attribute.component as string;
      if (attribute.repeatable) {
        const items = castArray((value as Snapshot[] | null) ?? []).filter(
          (item): item is Snapshot => !!item && typeof item === 'object'
        );
        return Promise.all(items.map((item) => componentToInput(componentUid, item, ctx)));
      }
      return value && typeof value === 'object'
        ? componentToInput(componentUid, value as Snapshot, ctx)
        : null;
    }
    case 'dynamiczone': {
      const items = castArray((value as Snapshot[] | null) ?? []).filter(
        (item): item is Snapshot =>
          !!item && typeof item === 'object' && typeof item.__component === 'string'
      );
      return Promise.all(
        items.map(async (item) => ({
          __component: item.__component,
          ...(await componentToInput(item.__component as string, item, ctx)),
        }))
      );
    }
    default:
      return value;
  }
};

/**
 * Converts snapshot attributes into a `documents.update` payload for the
 * parent: relations as ordered `{ set }` (missing targets dropped), media as
 * ids, components with their ids when the parent row owns them (otherwise
 * recreated), dynamic zones likewise.
 */
export const toUpdateInput = async (
  uid: string,
  changes: Snapshot,
  { targetEntryId }: { targetEntryId: number | string | null }
): Promise<Record<string, unknown>> => {
  const schema = getModel(uid);
  const ctx: ConvertContext = {
    attached:
      targetEntryId != null ? await collectAttachedComponentIds(uid, targetEntryId) : new Set(),
  };
  const out: Record<string, unknown> = {};

  for (const name of getSnapshotAttributeNames(schema)) {
    if (!(name in changes)) {
      continue;
    }
    out[name] = await valueToInput(schema.attributes[name], changes[name], ctx);
  }

  return out;
};
