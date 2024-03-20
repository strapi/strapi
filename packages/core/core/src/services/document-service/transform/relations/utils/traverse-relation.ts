import { isObject, curry, isNil } from 'lodash/fp';

import { async } from '@strapi/utils';

import { LongHand, Relation, ShortHand } from './types';

const passThrough = (relation: Relation) => relation;

type ResultOrPromise<T> = T | Promise<T>;

interface Transforms {
  // { id: 1 } || { documentId: 1 }
  // { set: { id: 1 } } || { set: [{ id: 1 }] }
  // { connect: { id: 1 } } || { connect: [{ id: 1 }] }
  // { disconnect: { id: 1 } } || { disconnect: [{ id: 1 }] }
  onLongHand?: (relation: LongHand) => ResultOrPromise<Relation>;
  // '1' || 1 || ['1', '2'] || [1, 2] || null
  onShortHand?: (relation: ShortHand) => ResultOrPromise<Relation>;
  // Anything else that is not a valid relation
  onElse?: (relation: Relation) => ResultOrPromise<Relation>;
}

const toArray = (value: any) => {
  // Keep value as it is if it's a nullish value
  if (isNil(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    return value;
  }

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
const traverseRelation = async (
  transforms: Transforms,
  rel: Relation,
  isRecursive = false
): Promise<Relation> => {
  let relation: Relation = rel;

  // Pass through if no transforms are provided
  const { onLongHand = passThrough, onShortHand = passThrough, onElse = passThrough } = transforms;

  // undefined | null
  if (isNil(relation)) {
    return onElse(relation);
  }

  // LongHand[] | ShortHand[]
  if (Array.isArray(relation)) {
    return async
      .map(relation, (r: Relation) => traverseRelation(transforms, r, true))
      .then((result: any) => result.flat().filter(Boolean))
      .then((result: any) => (isRecursive ? result : { set: result }));
  }

  // LongHand
  if (isObject(relation)) {
    // { id: 1 } || { documentId: 1 }
    if ('id' in relation || 'documentId' in relation) {
      const result = await onLongHand(relation as LongHand);

      if (isRecursive) {
        return result;
      }

      return { set: toArray(result) };
    }

    // If not connecting anything, return default visitor
    if (!relation.set && !relation.disconnect && !relation.connect) {
      return onElse(relation);
    }

    // { set }
    if (relation.set) {
      const set: any = await traverseRelation(transforms, relation.set, true);
      relation = { ...relation, set: toArray(set) };
    }

    // { disconnect}
    if (relation.disconnect) {
      const disconnect: any = await traverseRelation(transforms, relation.disconnect, true);
      relation = { ...relation, disconnect: toArray(disconnect) };
    }

    // { connect }
    if (relation.connect) {
      // Transform the relation to connect
      const connect: any = await traverseRelation(transforms, relation.connect, true);
      relation = { ...relation, connect: toArray(connect) };
    }

    return relation;
  }

  // ShortHand
  if (typeof relation === 'string' || typeof relation === 'number') {
    const result = onShortHand(relation as ShortHand);

    if (isRecursive) {
      return result;
    }

    return { set: toArray(result) };
  }

  // Anything else
  return onElse(relation);
};

const traverseRelationCurried = curry(traverseRelation);

export { traverseRelationCurried as traverseRelation };
