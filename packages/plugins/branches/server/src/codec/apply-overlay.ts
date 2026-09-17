import { castArray } from 'lodash/fp';

import { getModel, isSnapshotAttribute } from './attributes';
import {
  hydrateComponentValue,
  hydrateDynamicZone,
  hydrateMedia,
  hydrateRelation,
  type HydrateContext,
} from './hydrate';
import { getSpec, isRequested, normalizeFields, normalizePopulate } from './populate-spec';

import type { Snapshot } from './types';

/** Folds change sets left to right: later (child) sets win per top-level attribute. */
export const mergeChangeSets = (sets: Array<Snapshot | null | undefined>): Snapshot =>
  Object.assign({}, ...sets.filter((set): set is Snapshot => !!set));

export interface OverlayContext extends HydrateContext {
  populate?: unknown;
  fields?: unknown;
}

/**
 * Produces the branch view of one document: the row the document service
 * returned, with the folded delta laid over it. Only what the caller asked
 * for is touched — scalars filtered by `fields`, relations/media/components
 * only when populated (a relation populated as `{ count: true }` stays a count).
 */
export const applyOverlay = async (
  uid: string,
  document: Record<string, unknown>,
  merged: Snapshot,
  ctx: OverlayContext
): Promise<Record<string, unknown>> => {
  const schema = getModel(uid);
  const populateMap = normalizePopulate(schema, ctx.populate);
  const fields = normalizeFields(ctx.fields);
  const out: Record<string, unknown> = { ...document };

  for (const [name, value] of Object.entries(merged)) {
    if (!isSnapshotAttribute(schema, name)) {
      continue;
    }
    const attribute = schema.attributes[name];
    const requested = isRequested(populateMap, name);
    const spec = getSpec(populateMap, name);

    switch (attribute.type) {
      case 'relation':
        if (!requested) {
          break;
        }
        out[name] = spec.count
          ? { count: castArray(value ?? []).filter(Boolean).length }
          : await hydrateRelation(attribute, value, spec, ctx);
        break;
      case 'media':
        if (!requested) {
          break;
        }
        out[name] = await hydrateMedia(value, attribute.multiple === true, spec);
        break;
      case 'component':
        if (!requested) {
          break;
        }
        out[name] = await hydrateComponentValue(attribute, value, spec, ctx);
        break;
      case 'dynamiczone':
        if (!requested) {
          break;
        }
        out[name] = await hydrateDynamicZone(value, spec, ctx);
        break;
      default:
        if (fields && !fields.has(name)) {
          break;
        }
        out[name] = value;
    }
  }

  return out;
};
