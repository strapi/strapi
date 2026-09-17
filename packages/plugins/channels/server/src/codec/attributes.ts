// Copied from packages/plugins/branches/server/src/codec/attributes.ts — keep structurally
// in sync; extraction into a shared package is planned once both plugins are merged.
import { contentTypes as contentTypesUtils } from '@strapi/utils';

import { EXCLUDED_ATTRIBUTES, POPULATED_TYPES } from './constants';

import type { LooseAttribute, LooseSchema } from './types';

export const getModel = (uid: string): LooseSchema =>
  strapi.getModel(uid as never) as unknown as LooseSchema;

/** Join-table relations to a concrete target only; morphs and join-column FKs stay out. */
export const isSnapshotableRelation = (attribute: LooseAttribute | undefined): boolean =>
  attribute?.type === 'relation' &&
  typeof attribute.target === 'string' &&
  !String(attribute.relation ?? '')
    .toLowerCase()
    .startsWith('morph') &&
  attribute.useJoinTable !== false;

export const isToOneRelation = (attribute: LooseAttribute): boolean =>
  attribute.relation === 'oneToOne' || attribute.relation === 'manyToOne';

/**
 * Whether an attribute of `schema` is part of its snapshot: a visible,
 * non-excluded attribute (relations must be snapshotable, passwords never are).
 */
export const isSnapshotAttribute = (schema: LooseSchema, name: string): boolean => {
  const attribute = schema.attributes[name];
  if (!attribute || EXCLUDED_ATTRIBUTES.has(name)) {
    return false;
  }
  if (attribute.type === 'password') {
    return false;
  }
  if (attribute.type === 'relation' && !isSnapshotableRelation(attribute)) {
    return false;
  }
  return contentTypesUtils.isVisibleAttribute(schema as never, name);
};

export const getSnapshotAttributeNames = (schema: LooseSchema): string[] =>
  Object.keys(schema.attributes).filter((name) => isSnapshotAttribute(schema, name));

const getScalarSelect = (componentUid: string): string[] => {
  const schema = getModel(componentUid);
  return [
    'id',
    ...Object.entries(schema.attributes)
      .filter(([, attribute]) => !POPULATED_TYPES.has(attribute.type))
      .map(([name]) => name),
  ];
};

/**
 * Database-syntax populate reading everything a snapshot needs and nothing
 * more: relations as `{ documentId, locale }`, media as `{ id }`, components
 * with their scalar fields **and id** (kept so a merge updates rows in place),
 * dynamic zones through `on` fragments. Adapted from the History feature's
 * `getDeepPopulate` (EE-only service, hence copied).
 */
export const getSnapshotPopulate = (uid: string): Record<string, unknown> => {
  const schema = getModel(uid);
  const populate: Record<string, unknown> = {};

  for (const name of getSnapshotAttributeNames(schema)) {
    const attribute = schema.attributes[name];
    switch (attribute.type) {
      case 'relation':
        populate[name] = { select: ['id', 'documentId', 'locale'] };
        break;
      case 'media':
        populate[name] = { select: ['id'] };
        break;
      case 'component':
        populate[name] = {
          select: getScalarSelect(attribute.component as string),
          populate: getSnapshotPopulate(attribute.component as string),
        };
        break;
      case 'dynamiczone':
        populate[name] = {
          on: Object.fromEntries(
            (attribute.components ?? []).map((componentUid) => [
              componentUid,
              {
                select: getScalarSelect(componentUid),
                populate: getSnapshotPopulate(componentUid),
              },
            ])
          ),
        };
        break;
      default:
        break;
    }
  }

  return populate;
};

/**
 * Database-syntax populate selecting only the ids of every component row
 * (recursively) attached to an entry — the merge uses it to decide which
 * component ids in a delta may be updated in place.
 */
export const getComponentIdPopulate = (uid: string): Record<string, unknown> => {
  const schema = getModel(uid);
  const populate: Record<string, unknown> = {};

  for (const [name, attribute] of Object.entries(schema.attributes)) {
    if (attribute.type === 'component') {
      populate[name] = {
        select: ['id'],
        populate: getComponentIdPopulate(attribute.component as string),
      };
    } else if (attribute.type === 'dynamiczone') {
      populate[name] = {
        on: Object.fromEntries(
          (attribute.components ?? []).map((componentUid) => [
            componentUid,
            { select: ['id'], populate: getComponentIdPopulate(componentUid) },
          ])
        ),
      };
    }
  }

  return populate;
};
