import { castArray } from 'lodash/fp';
import { errors } from '@strapi/utils';

import { getModel, getSnapshotAttributeNames, isToOneRelation } from './attributes';
import { hasDraftAndPublish, isLocalizedContentType, runUnfiltered } from '../utils';

import type { LooseAttribute, LooseSchema, MediaRef, RelRef, Snapshot } from './types';

const { ValidationError } = errors;

type RelationItem = {
  id?: number | string;
  documentId?: string;
  locale?: string | null;
  position?: { start?: boolean; end?: boolean; before?: string; after?: string };
};

interface NormalizedRelationInput {
  set?: RelationItem[];
  connect?: RelationItem[];
  disconnect?: RelationItem[];
}

const toItem = (value: unknown): RelationItem | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return { id: value };
  }
  if (typeof value === 'string') {
    return { documentId: value };
  }
  if (typeof value === 'object') {
    const { id, documentId, locale, position } = value as RelationItem;
    if (id === undefined && documentId === undefined) {
      return null;
    }
    return { id, documentId, locale, position };
  }
  return null;
};

const toItems = (value: unknown): RelationItem[] =>
  castArray(value ?? [])
    .map(toItem)
    .filter((item): item is RelationItem => item !== null);

/**
 * Normalises every relation input form the document service accepts
 * (`transform/relations/utils/map-relation.ts`): nil, id, documentId, object,
 * array → `set`; `{ set, connect, disconnect }` kept as such.
 */
const normalizeRelationInput = (value: unknown): NormalizedRelationInput => {
  if (value === null || value === undefined) {
    return { set: [] };
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    if ('set' in record || 'connect' in record || 'disconnect' in record) {
      return {
        ...(record.set !== undefined ? { set: toItems(record.set) } : {}),
        ...(record.connect !== undefined ? { connect: toItems(record.connect) } : {}),
        ...(record.disconnect !== undefined ? { disconnect: toItems(record.disconnect) } : {}),
      };
    }
  }
  return { set: toItems(value) };
};

const sameRef = (a: RelRef, b: RelRef): boolean =>
  a.documentId === b.documentId && (a.locale ?? null) === (b.locale ?? null);

/**
 * Locale a related row is addressed by, mirroring core's
 * `transform/relations/utils/i18n.ts`: both sides localized → the source's
 * locale; only the target localized → the item's locale (or the source's);
 * otherwise none.
 */
const resolveTargetLocale = (
  targetUid: string,
  itemLocale: string | null | undefined,
  sourceLocale: string | null,
  sourceLocalized: boolean
): string | null => {
  const targetLocalized = isLocalizedContentType(getModel(targetUid));
  if (!targetLocalized) {
    return null;
  }
  if (sourceLocalized) {
    return sourceLocale ?? itemLocale ?? null;
  }
  return itemLocale ?? sourceLocale ?? null;
};

/** Resolves items to `RelRef`s; bare ids are looked up (ids are branch-unambiguous). */
const toRelRefs = async (
  targetUid: string,
  items: RelationItem[],
  sourceLocale: string | null,
  sourceLocalized: boolean
): Promise<Array<RelRef & { position?: RelationItem['position'] }>> => {
  const missing = items.filter((item) => !item.documentId && item.id !== undefined);
  const byId = new Map<string, { documentId: string; locale: string | null }>();
  if (missing.length > 0) {
    const rows: Array<{ id: number | string; documentId: string; locale: string | null }> =
      await runUnfiltered(() =>
        strapi.db.query(targetUid as never).findMany({
          where: { id: { $in: missing.map((item) => item.id) } },
          select: ['id', 'documentId', 'locale'],
        })
      );
    for (const row of rows) {
      byId.set(String(row.id), { documentId: row.documentId, locale: row.locale });
    }
  }

  const refs: Array<RelRef & { position?: RelationItem['position'] }> = [];
  for (const item of items) {
    const resolved = item.documentId
      ? { documentId: item.documentId, locale: item.locale ?? null }
      : byId.get(String(item.id));
    if (!resolved) {
      continue;
    }
    refs.push({
      documentId: resolved.documentId,
      locale: resolveTargetLocale(targetUid, resolved.locale, sourceLocale, sourceLocalized),
      position: item.position,
    });
  }
  return refs;
};

/**
 * Folds a relation input onto the current snapshot list: `set` replaces,
 * `disconnect` removes by `(documentId, locale)`, `connect` inserts honouring
 * `position` (`start` / `end` / `before` / `after` by documentId — what the
 * Content Manager sends, in reversed display order with chained `before`s).
 * An unresolvable anchor degrades to "append", like the database layer's
 * non-strict ordering. toOne keeps the last item.
 */
export const applyRelationInput = async (
  attribute: LooseAttribute,
  value: unknown,
  current: unknown,
  sourceLocale: string | null,
  sourceLocalized: boolean
): Promise<RelRef | RelRef[] | null> => {
  const targetUid = attribute.target as string;
  const toOne = isToOneRelation(attribute);
  let list: RelRef[] = toOne
    ? current
      ? [current as RelRef]
      : []
    : castArray((current as RelRef[] | null) ?? []).filter(Boolean);

  const input = normalizeRelationInput(value);
  const strip = (ref: RelRef & { position?: unknown }): RelRef => ({
    documentId: ref.documentId,
    locale: ref.locale ?? null,
  });

  if (input.set) {
    list = (await toRelRefs(targetUid, input.set, sourceLocale, sourceLocalized)).map(strip);
  } else {
    for (const ref of await toRelRefs(
      targetUid,
      input.disconnect ?? [],
      sourceLocale,
      sourceLocalized
    )) {
      list = list.filter((existing) => !sameRef(existing, ref));
    }

    let pending = await toRelRefs(targetUid, input.connect ?? [], sourceLocale, sourceLocalized);
    for (let pass = 0; pass < 2 && pending.length > 0; pass += 1) {
      const deferred: typeof pending = [];
      for (const ref of pending) {
        list = list.filter((existing) => !sameRef(existing, ref));
        const item = strip(ref);
        const { position } = ref;
        if (!position || position.end) {
          list.push(item);
        } else if (position.start) {
          list.unshift(item);
        } else if (position.before !== undefined) {
          const index = list.findIndex((existing) => existing.documentId === position.before);
          if (index < 0) {
            if (pass === 0) {
              deferred.push(ref);
            } else {
              list.push(item);
            }
          } else {
            list.splice(index, 0, item);
          }
        } else if (position.after !== undefined) {
          const index = list.findIndex((existing) => existing.documentId === position.after);
          if (index < 0) {
            if (pass === 0) {
              deferred.push(ref);
            } else {
              list.push(item);
            }
          } else {
            list.splice(index + 1, 0, item);
          }
        } else {
          list.push(item);
        }
      }
      pending = deferred;
    }
  }

  return toOne ? (list.at(-1) ?? null) : list;
};

const isRelationTouched = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    if ('set' in record || 'connect' in record || 'disconnect' in record) {
      return (
        record.set !== undefined ||
        castArray(record.connect ?? []).length > 0 ||
        castArray(record.disconnect ?? []).length > 0
      );
    }
  }
  return true;
};

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

/** Media input: full file objects, ids, `{ id }`, arrays, `null`, or `{ set | connect | disconnect }`. */
const mediaInputToRefs = (value: unknown, multiple: boolean, current: unknown): unknown => {
  let list: MediaRef[] = multiple
    ? castArray((current as MediaRef[] | null) ?? []).filter(Boolean)
    : current
      ? [current as MediaRef]
      : [];

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    if ('set' in record || 'connect' in record || 'disconnect' in record) {
      if (record.set !== undefined) {
        list = castArray(record.set ?? [])
          .map(toMediaRef)
          .filter((ref): ref is MediaRef => ref !== null);
      } else {
        const disconnect = castArray(record.disconnect ?? [])
          .map(toMediaRef)
          .filter((ref): ref is MediaRef => ref !== null);
        list = list.filter((ref) => !disconnect.some((d) => String(d.id) === String(ref.id)));
        for (const ref of castArray(record.connect ?? []).map(toMediaRef)) {
          if (ref && !list.some((existing) => String(existing.id) === String(ref.id))) {
            list.push(ref);
          }
        }
      }
      return multiple ? list : (list.at(-1) ?? null);
    }
  }

  const refs = castArray(value ?? [])
    .map(toMediaRef)
    .filter((ref): ref is MediaRef => ref !== null);
  return multiple ? refs : (refs.at(-1) ?? null);
};

interface ConvertContext {
  rootUid: string;
  locale: string | null;
  sourceLocalized: boolean;
}

const indexComponentsById = (values: unknown): Map<string, Record<string, unknown>> => {
  const index = new Map<string, Record<string, unknown>>();
  for (const item of castArray(values ?? [])) {
    if (item && typeof item === 'object' && (item as { id?: unknown }).id != null) {
      index.set(String((item as { id: unknown }).id), item as Record<string, unknown>);
    }
  }
  return index;
};

const componentFromInput = async (
  componentUid: string,
  input: Record<string, unknown>,
  current: Record<string, unknown> | undefined,
  ctx: ConvertContext
): Promise<Snapshot> => {
  const schema = getModel(componentUid);
  const snapshot: Snapshot = {};
  if (input.id !== undefined && input.id !== null) {
    snapshot.id = input.id;
  }
  for (const name of getSnapshotAttributeNames(schema)) {
    const attribute = schema.attributes[name];
    if (attribute.type === 'relation') {
      // Relations inside components of inherited documents are not overlaid
      // yet (the relations endpoint is keyed by component row id). Keep what
      // the branch already had; refuse changes with a clear message.
      if (isRelationTouched(input[name])) {
        throw new ValidationError(
          `Changing the relation "${name}" inside a component is not supported on a branch yet. Merge the branch first, or edit it on main.`
        );
      }
      if (current && name in current) {
        snapshot[name] = current[name];
      }
      continue;
    }
    if (!(name in input)) {
      continue;
    }
    snapshot[name] = await valueFromInput(schema, name, input[name], current?.[name], ctx);
  }
  return snapshot;
};

const valueFromInput = async (
  schema: LooseSchema,
  name: string,
  value: unknown,
  current: unknown,
  ctx: ConvertContext
): Promise<unknown> => {
  const attribute = schema.attributes[name];
  switch (attribute.type) {
    case 'relation':
      return applyRelationInput(attribute, value, current, ctx.locale, ctx.sourceLocalized);
    case 'media':
      return mediaInputToRefs(value, attribute.multiple === true, current);
    case 'component': {
      const componentUid = attribute.component as string;
      if (attribute.repeatable) {
        const currentById = indexComponentsById(current);
        const items = castArray(value ?? []).filter(
          (item): item is Record<string, unknown> => !!item && typeof item === 'object'
        );
        const out: Snapshot[] = [];
        for (const item of items) {
          out.push(
            await componentFromInput(
              componentUid,
              item,
              item.id != null ? currentById.get(String(item.id)) : undefined,
              ctx
            )
          );
        }
        return out;
      }
      if (!value || typeof value !== 'object') {
        return null;
      }
      const record = value as Record<string, unknown>;
      const currentRecord =
        current && typeof current === 'object' ? (current as Record<string, unknown>) : undefined;
      return componentFromInput(
        componentUid,
        record,
        currentRecord && String(currentRecord.id) === String(record.id) ? currentRecord : undefined,
        ctx
      );
    }
    case 'dynamiczone': {
      const currentById = indexComponentsById(current);
      const items = castArray(value ?? []).filter(
        (item): item is Record<string, unknown> =>
          !!item &&
          typeof item === 'object' &&
          typeof (item as Record<string, unknown>).__component === 'string'
      );
      const out: Snapshot[] = [];
      for (const item of items) {
        const componentUid = item.__component as string;
        out.push({
          __component: componentUid,
          ...(await componentFromInput(
            componentUid,
            item,
            item.id != null ? currentById.get(String(item.id)) : undefined,
            ctx
          )),
        });
      }
      return out;
    }
    default:
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value === undefined ? null : value;
  }
};

/**
 * Converts the input of a `documents.update` call (what the Content Manager
 * or the API sends) into snapshot format, for the attributes present in
 * `input` only. Relation inputs are folded onto `current` (the branch's view
 * before this update) so the snapshot always holds the full ordered list.
 */
export const toSnapshot = async (
  uid: string,
  input: Record<string, unknown>,
  current: Snapshot,
  { locale }: { locale: string | null }
): Promise<Snapshot> => {
  const schema = getModel(uid);
  const ctx: ConvertContext = {
    rootUid: uid,
    locale,
    sourceLocalized: isLocalizedContentType(schema),
  };
  const snapshot: Snapshot = {};

  for (const name of getSnapshotAttributeNames(schema)) {
    if (!(name in input)) {
      continue;
    }
    if (input[name] === undefined) {
      continue;
    }
    snapshot[name] = await valueFromInput(schema, name, input[name], current[name], ctx);
  }

  return snapshot;
};

export const targetHasDraftAndPublish = (targetUid: string): boolean =>
  hasDraftAndPublish(getModel(targetUid));
