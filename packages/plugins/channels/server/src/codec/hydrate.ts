// Copied from packages/plugins/branches/server/src/codec/hydrate.ts — keep structurally
// in sync; extraction into a shared package is planned once both plugins are merged.
import { castArray } from 'lodash/fp';

import { MAX_OVERLAY_DEPTH } from '../constants';
import { getOverlayDepth, hasDraftAndPublish, isLocalizedContentType, runDeeper } from '../utils';
import { getModel, getSnapshotAttributeNames, isToOneRelation } from './attributes';
import { getSpec, isRequested, normalizePopulate } from './populate-spec';

import type { LooseAttribute, MediaRef, PopulateSpec, RelRef, Snapshot } from './types';

export interface HydrateContext {
  locale: string | null;
}

const UPLOAD_FILE_UID = 'plugin::upload.file';

/** `{ id }` refs → full file rows (what the Media Library input renders), in ref order. */
export const hydrateMedia = async (
  value: unknown,
  multiple: boolean,
  spec: PopulateSpec
): Promise<unknown> => {
  const refs = castArray((value as MediaRef[] | MediaRef | null) ?? []).filter(
    (ref): ref is MediaRef => !!ref && ref.id !== undefined && ref.id !== null
  );
  if (refs.length === 0) {
    return multiple ? [] : null;
  }

  const nested = normalizePopulate(getModel(UPLOAD_FILE_UID), spec.populate);
  const rows: Array<Record<string, unknown> & { id: number | string }> = await strapi.db
    .query(UPLOAD_FILE_UID)
    .findMany({
      where: { id: { $in: refs.map((ref) => ref.id) } },
      ...(isRequested(nested, 'folder') ? { populate: { folder: true } } : {}),
    });

  const byId = new Map(rows.map((row) => [String(row.id), row]));
  const ordered = refs
    .map((ref) => byId.get(String(ref.id)))
    .filter((row): row is (typeof rows)[number] => row !== undefined);

  return multiple ? ordered : (ordered[0] ?? null);
};

/**
 * `{ documentId, locale }` refs → documents. Goes through the document service
 * (so targets edited on the branch are overlaid too) until the re-entrancy cap,
 * then falls back to raw rows.
 */
export const hydrateRelation = async (
  attribute: LooseAttribute,
  value: unknown,
  spec: PopulateSpec,
  _ctx: HydrateContext
): Promise<unknown> => {
  const toOne = isToOneRelation(attribute);
  const refs = castArray((value as RelRef[] | RelRef | null) ?? []).filter(
    (ref): ref is RelRef => !!ref && typeof ref.documentId === 'string'
  );
  if (refs.length === 0) {
    return toOne ? null : [];
  }

  const targetUid = attribute.target as string;
  const targetModel = getModel(targetUid);
  const targetLocalized = isLocalizedContentType(targetModel);
  const targetDraftAndPublish = hasDraftAndPublish(targetModel);
  const keyOf = (documentId: string, locale: string | null | undefined) =>
    targetLocalized ? `${documentId}:${locale ?? ''}` : documentId;

  const rows: Array<Record<string, unknown> & { documentId: string; locale?: string | null }> = [];

  if (getOverlayDepth() >= MAX_OVERLAY_DEPTH) {
    const raw = await strapi.db.query(targetUid as never).findMany({
      where: {
        documentId: { $in: [...new Set(refs.map((ref) => ref.documentId))] },
        ...(targetDraftAndPublish ? { publishedAt: null } : {}),
      },
    });
    rows.push(...raw);
  } else {
    const byLocale = new Map<string, RelRef[]>();
    for (const ref of refs) {
      const key = targetLocalized ? (ref.locale ?? '') : '';
      byLocale.set(key, [...(byLocale.get(key) ?? []), ref]);
    }
    for (const [locale, group] of byLocale) {
      const found = await runDeeper(() =>
        strapi.documents(targetUid as never).findMany({
          filters: { documentId: { $in: [...new Set(group.map((ref) => ref.documentId))] } },
          ...(targetLocalized && locale ? { locale } : {}),
          ...(targetDraftAndPublish ? { status: 'draft' } : {}),
          ...(spec.fields ? { fields: spec.fields } : {}),
          ...(spec.populate !== undefined ? { populate: spec.populate } : {}),
        } as never)
      );
      rows.push(...(found as typeof rows));
    }
  }

  const byKey = new Map(rows.map((row) => [keyOf(row.documentId, row.locale), row]));
  const ordered = refs
    .map((ref) => byKey.get(keyOf(ref.documentId, ref.locale)))
    .filter((row): row is (typeof rows)[number] => row !== undefined);

  return toOne ? (ordered[0] ?? null) : ordered;
};

/**
 * Hydrates one component snapshot for output: media and relations become rows
 * or `{ count }` when the caller populated them, unrequested ones are dropped
 * (the document service does not return them either), nested components recurse.
 */
export const hydrateComponent = async (
  componentUid: string,
  value: Snapshot,
  spec: PopulateSpec,
  ctx: HydrateContext
): Promise<Record<string, unknown>> => {
  const schema = getModel(componentUid);
  const nested = normalizePopulate(schema, spec.populate);
  const out: Record<string, unknown> = {};

  if (value.id !== undefined) {
    out.id = value.id;
  }
  if (value.__component !== undefined) {
    out.__component = value.__component;
  }

  for (const name of getSnapshotAttributeNames(schema)) {
    if (!(name in value)) {
      continue;
    }
    const attribute = schema.attributes[name];
    const attributeValue = value[name];
    switch (attribute.type) {
      case 'relation':
        if (!isRequested(nested, name)) {
          break;
        }
        out[name] = getSpec(nested, name).count
          ? { count: castArray(attributeValue ?? []).filter(Boolean).length }
          : await hydrateRelation(attribute, attributeValue, getSpec(nested, name), ctx);
        break;
      case 'media':
        if (!isRequested(nested, name)) {
          break;
        }
        out[name] = await hydrateMedia(
          attributeValue,
          attribute.multiple === true,
          getSpec(nested, name)
        );
        break;
      case 'component':
        if (!isRequested(nested, name)) {
          break;
        }
        out[name] = await hydrateComponentValue(
          attribute,
          attributeValue,
          getSpec(nested, name),
          ctx
        );
        break;
      case 'dynamiczone':
        if (!isRequested(nested, name)) {
          break;
        }
        out[name] = await hydrateDynamicZone(attributeValue, getSpec(nested, name), ctx);
        break;
      default:
        out[name] = attributeValue;
    }
  }

  return out;
};

export const hydrateComponentValue = async (
  attribute: LooseAttribute,
  value: unknown,
  spec: PopulateSpec,
  ctx: HydrateContext
): Promise<unknown> => {
  const componentUid = attribute.component as string;
  if (attribute.repeatable) {
    const items = castArray((value as Snapshot[] | null) ?? []).filter(
      (item): item is Snapshot => !!item && typeof item === 'object'
    );
    return Promise.all(items.map((item) => hydrateComponent(componentUid, item, spec, ctx)));
  }
  if (!value || typeof value !== 'object') {
    return null;
  }
  return hydrateComponent(componentUid, value as Snapshot, spec, ctx);
};

export const hydrateDynamicZone = async (
  value: unknown,
  spec: PopulateSpec,
  ctx: HydrateContext
): Promise<unknown[]> => {
  const items = castArray((value as Snapshot[] | null) ?? []).filter(
    (item): item is Snapshot =>
      !!item && typeof item === 'object' && typeof item.__component === 'string'
  );
  return Promise.all(
    items.map((item) =>
      hydrateComponent(
        item.__component as string,
        item,
        spec.on?.[item.__component as string] ?? { populate: spec.populate },
        ctx
      )
    )
  );
};
