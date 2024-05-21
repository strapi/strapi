/* eslint-disable node/no-callback-literal */
import { isObject, curry, isNil } from 'lodash/fp';

import type { UID } from '@strapi/types';
import { traverseEntity, async } from '@strapi/utils';

import { Relation } from './types';

const isNumeric = (value: any): value is number => {
  if (Array.isArray(value)) return false; // Handle [1, 'docId'] case
  const parsed = parseInt(value, 10);
  return !Number.isNaN(parsed);
};

const toArray = (value: any) => {
  // Keep value as it is if it's a nullish value
  if (isNil(value)) return value;
  if (Array.isArray(value)) return value;

  return [value];
};

/**
 * There are multiple ways to create Strapi relations.
 * This is a utility to traverse and transform relation data
 *
 *
 * For consistency and ease of use, the response will always be an object with the following shape:
 * { set: [{...}], connect: [{...}], disconnect: [{...}] }
 *
 * @example
 * transformRelationData({
 *  onLongHand: (relation) => {
 *    // Change the id of the relation
 *    return { id: 'other' };
 *  },
 * }, relation)
 */
const mapRelation = async (
  callback: (relation: any) => any,
  rel: Relation,
  isRecursive = false
): Promise<Relation> => {
  let relation: Relation = rel;

  const wrapInSet = (value: any) => {
    // Ignore wrapping if it's a recursive call
    if (isRecursive) {
      return value;
    }
    return { set: toArray(value) };
  };

  // undefined | null
  if (isNil(relation)) {
    return callback(relation);
  }

  // LongHand[] | ShortHand[]
  if (Array.isArray(relation)) {
    return async
      .map(relation, (r: Relation) => mapRelation(callback, r, true))
      .then((result: any) => result.flat().filter(Boolean))
      .then(wrapInSet);
  }

  // LongHand
  if (isObject(relation)) {
    // { id: 1 } || { documentId: 1 }
    if ('id' in relation || 'documentId' in relation) {
      const result = await callback(relation);
      return wrapInSet(result);
    }

    // If not connecting anything, return default visitor
    if (!relation.set && !relation.disconnect && !relation.connect) {
      return callback(relation);
    }

    // { set }
    if (relation.set) {
      const set: any = await mapRelation(callback, relation.set, true);
      relation = { ...relation, set: toArray(set) };
    }

    // { disconnect}
    if (relation.disconnect) {
      const disconnect: any = await mapRelation(callback, relation.disconnect, true);
      relation = { ...relation, disconnect: toArray(disconnect) };
    }

    // { connect }
    if (relation.connect) {
      // Transform the relation to connect
      const connect: any = await mapRelation(callback, relation.connect, true);
      relation = { ...relation, connect: toArray(connect) };
    }

    return relation;
  }

  // ShortHand
  if (isNumeric(relation)) {
    const result = await callback({ id: relation });
    return wrapInSet(result);
  }

  if (typeof relation === 'string') {
    const result = await callback({ documentId: relation });
    return wrapInSet(result);
  }

  // Anything else
  return callback(relation);
};

type TraverseEntity = Parameters<typeof traverseEntity>;

/**
 * Utility function, same as `traverseEntity` but only for relations.
 */
const traverseEntityRelations = async (
  visitor: TraverseEntity[0],
  options: TraverseEntity[1],
  data: TraverseEntity[2]
) => {
  return traverseEntity(
    async (options, utils) => {
      const { attribute } = options;

      if (!attribute) {
        return;
      }

      if (attribute.type !== 'relation') {
        return;
      }

      // TODO: Handle join columns
      if (attribute.useJoinTable === false) {
        return;
      }

      // TODO: Handle morph relations (they have multiple targets)
      const target = attribute.target as UID.Schema | undefined;
      if (!target) {
        return;
      }

      return visitor(options, utils);
    },
    options,
    data
  );
};

const mapRelationCurried = curry(mapRelation);
const traverseEntityRelationsCurried = curry(traverseEntityRelations);

export {
  mapRelationCurried as mapRelation,
  traverseEntityRelationsCurried as traverseEntityRelations,
};
