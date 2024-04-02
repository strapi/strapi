import { isObject, isNil, pick } from 'lodash/fp';

import type { Modules, Schema, UID } from '@strapi/types';
import { traverseEntity, errors } from '@strapi/utils';

import { ShortHand, LongHand, ID, GetIds } from '../utils/types';
import { isShortHand, isLongHand } from '../utils/data';
import { IdMap } from '../../id-map';
import { getRelationTargetLocale } from '../utils/i18n';
import { getRelationTargetStatus } from '../utils/dp';

const isNumeric = (value: any): value is number => {
  if (Array.isArray(value)) return false; // Handle [1, 'docId'] case
  const parsed = parseInt(value, 10);
  return !Number.isNaN(parsed);
};

/**
 * Transform primitive relation representation to entry ids
 *
 *  docId -> id
 *  [docId] -> [id]
 *  { documentID, locale, status } -> { id }
 *  [{ documentID, locale, status }] -> [{ id }]
 *
 * Note: There are scenarios where a single documentID can map to multiple ids.
 * By default the returned format will match the input format.
 * Only when the docID maps to multiple ids, an array will always be returned, regardless of the input format.
 */
const transformPrimitive = <T extends ShortHand | LongHand>(
  relation: T | T[] | null | undefined,
  getIds: GetIds
): T | T[] | undefined => {
  // TODO: Remove this, we should use the long hand version with 'id' for this case
  // If id value is a number, return it as is, it's already an entry id
  if (isNumeric(relation)) {
    return relation;
  }

  // null
  if (isNil(relation)) {
    return relation as T | undefined;
  }

  // id
  if (isShortHand(relation)) {
    const ids = getIds(relation) as T[];

    // Return it with the same format for consistency
    if (ids?.length === 1) return ids[0];

    // Return an array if multiple ids are found
    return ids;
  }

  // { id }
  if (isLongHand(relation)) {
    // If the id is already an entry id, return it as is
    if (!('documentId' in relation)) return relation;

    // @ts-expect-error - TODO: Add relation type
    const ids = getIds(relation.documentId, relation.locale, relation.status);

    // No ids to connect
    if (!ids?.length) return undefined;

    // Return it with the same format for consistency
    if (ids.length === 1) return { id: ids[0], ...pick(['position'], relation) } as T;

    // Return an array if it multiple ids are found
    return ids.map((id: ID) => ({ id, ...pick(['position'], relation) })) as T[];
  }

  // id[]
  if (Array.isArray(relation)) {
    return relation.flatMap((item) => transformPrimitive(item, getIds)).filter(Boolean) as T[];
  }

  return undefined;
};

/**
 * Transform ids in any type of relation input value
 *  - set: [docId]
 *  - disconnect: [docId]
 *  - connect: [docId]
 * Or using any of the other primitive representations
 */
const transformRelationIdsVisitor = <T extends Schema.Attribute.RelationKind.Any>(
  relation: Modules.EntityService.Params.Attribute.RelationInputValue<T>,
  getIds: GetIds
): Modules.EntityService.Params.Attribute.RelationInputValue<T> | undefined => {
  const map = transformPrimitive(relation as any, getIds);
  if (map) return map;

  if (!isObject(relation)) return relation;

  if (!('set' in relation) && !('disconnect' in relation) && !('connect' in relation)) {
    // The entry id couldn't be found and there are no connection properties in
    // the relation, therefore we want to remove the relation
    return;
  }

  // set: id[]
  // what if result of mapPrimitive is undefined?
  if ('set' in relation) {
    relation.set = transformPrimitive(relation.set as any, getIds);
  }

  if ('disconnect' in relation) {
    relation.disconnect = transformPrimitive(relation.disconnect as any, getIds);
  }

  if ('connect' in relation) {
    // connect: id[] | { id } | ...
    relation.connect = transformPrimitive(relation.connect as any, getIds);

    const mapPosition = (relation: any) => {
      if (isShortHand(relation) || !('position' in relation)) return relation;

      const position = { ...relation?.position };

      // { connect: { id: id, position: { before: id } } }
      if (position?.before) {
        const result = transformPrimitive({ ...position, documentId: position.before }, getIds);

        if (Array.isArray(result)) {
          position.before = result[0]?.id;
        } else {
          position.before = result?.id;
        }
      }

      // { connect: { id: id, position: { after: id } } }
      if (position?.after) {
        const result = transformPrimitive({ ...position, documentId: position.after }, getIds);

        if (Array.isArray(result)) {
          position.after = result[0]?.id;
        } else {
          position.after = result?.id;
        }
      }

      return { ...relation, position };
    };

    if (Array.isArray(relation.connect)) {
      relation.connect = relation.connect.map(mapPosition);
    } else {
      relation.connect = mapPosition(relation.connect);
    }
  }

  return relation;
};

const EXCLUDED_FIELDS = [
  'createdBy',
  'updatedBy',
  'localizations',
  'strapi_stage',
  'strapi_assignee',
];

const transformDataIdsVisitor = (
  idMap: IdMap,
  data: Record<string, any>,
  opts: {
    uid: UID.Schema;
    locale?: string | null;
    status?: 'draft' | 'published';
    allowMissingId?: boolean; // Whether to ignore missing ids and not throw any error
  }
) => {
  return traverseEntity(
    ({ key, value, attribute }, { set }) => {
      // Find relational attributes, and return the document ids
      if (attribute.type === 'relation') {
        const target = attribute.target as UID.Schema | undefined;
        // TODO: Handle polymorphic relations
        if (!target) return;
        // TODO: V5 remove excluded fields and use { id: } syntax for those relations
        if (EXCLUDED_FIELDS.includes(key)) return;

        const getIds = (
          documentId: ID,
          locale?: string,
          status?: 'draft' | 'published'
        ): ID[] | null => {
          // locale to connect to
          const targetLocale = getRelationTargetLocale(
            { documentId, locale },
            { targetUid: target, sourceUid: opts.uid, sourceLocale: opts.locale }
          );

          // status(es) to connect to
          const targetStatuses = getRelationTargetStatus(
            { documentId, status },
            { targetUid: target, sourceUid: opts.uid, sourceStatus: opts.status }
          );

          const ids = [];

          // Find mapping between documentID -> id(s).
          // There are scenarios where a single documentID can map to multiple ids.
          // e.g when connecting Non DP -> DP and connecting to both the draft and publish version at the same time
          for (const targetStatus of targetStatuses) {
            const entryId = idMap.get({
              uid: target,
              documentId,
              locale: targetLocale,
              status: targetStatus,
            });

            if (entryId) ids.push(entryId);
          }

          if (!ids.length && !opts.allowMissingId) {
            throw new errors.ValidationError(
              `Document with id "${documentId}", locale "${targetLocale}" not found`
            );
          }

          return ids;
        };

        const newRelation = transformRelationIdsVisitor(value as any, getIds);
        set(key, newRelation as any);
      }
    },
    { schema: strapi.getModel(opts.uid), getModel: strapi.getModel.bind(strapi) },
    data
  );
};

export { transformDataIdsVisitor };
