import { isObject, curry } from 'lodash/fp';

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
  // { connect: { id: 1, position: { before: 1 } } }
  onPositionBefore?: (relation: LongHand) => ResultOrPromise<Relation>;
  // { connect: { id: 1, position: { after: 1 } } }
  onPositionAfter?: (relation: LongHand) => ResultOrPromise<Relation>;
  onDisconnect?: (relation: Relation) => ResultOrPromise<Relation>;
  // '1' || 1 || ['1', '2'] || [1, 2] || null
  onShortHand?: (relation: ShortHand) => ResultOrPromise<Relation>;

  onDefault?: (relation: Relation) => ResultOrPromise<Relation>;
}

/**
 * There are multiple ways to interact with Strapi relations.
 * This is a utility to transform the relation data to a desired format.
 *
 * @example
 * transformRelationData({
 *  onLongHand: (relation) => {
 *    // Change the id of the relation
 *    return { id: 'other' };
 *  },
 * }, relation)
 */
const traverseRelation = async (transforms: Transforms, rel: Relation): Promise<Relation> => {
  let relation: Relation = rel;

  // Pass through if no transforms are provided
  const {
    onLongHand = passThrough,
    onShortHand = passThrough,
    onPositionBefore = passThrough,
    onPositionAfter = passThrough,
    onDefault = passThrough,
  } = transforms;

  // LongHand[] | ShortHand[]
  if (Array.isArray(relation)) {
    return async
      .map(relation, (r: Relation) => traverseRelation(transforms, r))
      .then((result: any) => result.flat().filter(Boolean));
  }

  // LongHand
  if (isObject(relation)) {
    // { id: 1 } || { documentId: 1 }
    if ('id' in relation || 'documentId' in relation) {
      return onLongHand(relation as LongHand);
    }

    // If not connecting anything, return default visitor
    if (!relation.set && !relation.disconnect && !relation.connect) {
      return onDefault(relation);
    }

    // { set }
    if (relation.set) {
      const set: any = await traverseRelation(transforms, relation.set);
      relation = { ...relation, set };
    }

    // { disconnect}
    if (relation.disconnect) {
      const disconnect: any = await traverseRelation(transforms, relation.disconnect);
      relation = { ...relation, disconnect };
    }

    /**
     * Connect is the most complex scenario.
     *
     * User can:
     * - connect a single relation or an array of relations.
     *   - { connect: { id: 1 } }
     *   - { connect: [{ id: 1 }, { id: 2 }] }
     * - connect an id or a document id
     *   - { connect: { id: 1 } }
     *   - { connect: { documentId: 1, locale, status } }
     * - connect with a position
     *   - { connect: { id: 1, position: { before, after, end, start }} }
     *
     * Here the visitor will be called for each connect relation.
     */
    if (relation.connect) {
      let connect = relation.connect;

      const mapConnectPosition = async (connect: any) => {
        let position = connect?.position;

        if (!position) {
          return connect;
        }

        if (position?.before) {
          position = await onPositionBefore(position);
        }

        if (position?.after) {
          position = await onPositionAfter(position);
        }

        return { ...connect, position };
      };

      if (Array.isArray(connect)) {
        connect = await async.map(connect, mapConnectPosition);
      } else {
        connect = await mapConnectPosition(connect);
      }

      // @ts-expect-error - fix type
      connect = await traverseRelation(transforms, connect);

      relation = { ...relation, connect };
    }

    return relation;
  }

  // ShortHand
  if (typeof relation === 'string' || typeof relation === 'number') {
    return onShortHand(relation as ShortHand);
  }

  // Anything else
  return onDefault(relation);
};

const traverseRelationCurried = curry(traverseRelation);

export { traverseRelationCurried as traverseRelation };
