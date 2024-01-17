import { EntityService, Attribute, Schema } from '@strapi/types';
import { traverseEntity } from '@strapi/utils';
import { isObject } from 'lodash/fp';

// TODO: Shorthand id should only be a string on documents.
// It's also a number here to make it works with existing V4 types.
type ID = string | number;
type ShortHand = ID;
type LongHand = { id: ID };

const isShortHand = (relation: any): relation is string | number => {
  return typeof relation === 'string' || typeof relation === 'number';
};

const isLongHand = (relation: any): relation is { id: ID } => {
  return isObject(relation) && 'id' in relation;
};

/**
 * Get relation ids from shorthand id (id)
 */
const handleShortHand = (relation: ShortHand): ID[] => [relation];

/**
 * Get relation ids from arrayed ids (id[], {id}[])
 */
const handleArray = (array: ShortHand[] | LongHand[]) =>
  array.map((item) => (isShortHand(item) ? item : item.id));

/**
 *  Get relation ids from primitive representation (id, id[], {id}, {id}[])
 */
const handlePrimitive = (
  relation: ShortHand | LongHand | ShortHand[] | LongHand[] | null | undefined
) => {
  if (!relation) return []; // null
  if (isShortHand(relation)) return handleShortHand(relation); // id
  if (isLongHand(relation)) return handleShortHand(relation.id); // { id }
  if (Array.isArray(relation)) return handleArray(relation); // id[]

  return [];
};

/**
 * Get all relations document ids from a relation input value
 */
const extractRelationIdsVisitor = <T extends Attribute.RelationKind.Any>(
  relation: EntityService.Params.Attribute.RelationInputValue<T>
): ID[] => {
  if (!relation) return []; // null
  if (isShortHand(relation)) return handleShortHand(relation); // id
  if (isLongHand(relation)) return handleShortHand(relation.id); // { id }
  if (Array.isArray(relation)) return relation.map((item) => (isShortHand(item) ? item : item.id)); // id[]

  const ids = [];

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

export { extractDataIds };
