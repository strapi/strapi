import { EntityService, Attribute, Schema, LoadedStrapi } from '@strapi/types';
import { traverseEntity } from '@strapi/utils';
import { isObject } from 'lodash/fp';
import { ShortHand, LongHand, ID } from '../utils/types';
import { isShortHand, isLongHand } from '../utils/data';

/**
 *  Get relation ids from primitive representation (id, id[], {id}, {id}[])
 */
const handlePrimitive = (
  relation: ShortHand | LongHand | ShortHand[] | LongHand[] | null | undefined | any
) => {
  if (!relation) return []; // null
  if (isShortHand(relation)) return [relation]; // id
  if (isLongHand(relation)) return [relation.id]; // { id }
  if (Array.isArray(relation)) return relation.map((item) => (isShortHand(item) ? item : item.id)); // id[]

  return [];
};

/**
 * Get all relations document ids from a relation input value
 */
const extractRelationIdsVisitor = <T extends Attribute.RelationKind.Any>(
  relation: EntityService.Params.Attribute.RelationInputValue<T>
): ID[] => {
  const ids = handlePrimitive(relation);
  if (!isObject(relation)) return ids;

  if ('set' in relation) ids.push(...handlePrimitive(relation.set)); // set: id[]
  if ('disconnect' in relation) ids.push(...handlePrimitive(relation.disconnect)); // disconnect: id[]
  if ('connect' in relation) {
    // connect: id[] | { id } | ...
    if (!relation.connect) return [];
    ids.push(...handlePrimitive(relation.connect));

    // handle positional arguments
    const connect = Array.isArray(relation.connect) ? relation.connect : [relation.connect];
    connect.forEach((item) => {
      if (isShortHand(item) || !('position' in item)) return;

      // { connect: { id: id, position: { before: id } } }
      if (item.position?.before) {
        ids.push(...handlePrimitive(item.position.before));
      }

      // { connect: { id: id, position: { after: id } } }
      if (item.position?.after) {
        ids.push(...handlePrimitive(item.position.after));
      }
    });
  }

  return ids;
};

/**
 * Iterate over all attributes of a Data object and extract all relational document ids.
 * Those will later be transformed to entity ids.
 */
const extractDataIds = async (schema: Schema.ContentType, data: Record<string, any>) => {
  const ids: ID[] = [];

  await traverseEntity(
    ({ value, attribute }) => {
      // Find relational attributes, and return the document ids
      if (attribute.type === 'relation') {
        ids.push(...extractRelationIdsVisitor(value as any));
      }
    },
    { schema },
    data
  );

  return ids;
};

// Whats the best way to , given documentIds, find the entityIds?
const queryIds = async (
  strapi: LoadedStrapi,
  opts: { uid: string; locale: string; isDraft: boolean; documentIds: ID[] }
) => {
  return strapi.db.query(opts.uid).findMany({
    select: ['id', 'documentId'],
    where: {
      id: { $in: opts.documentIds },
      locale: opts.locale,
      published_at: opts.isDraft ? null : { $ne: null },
    },
  });
};

export { extractDataIds };
