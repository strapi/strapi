import { castArray, maxBy } from 'lodash/fp';
import _ from 'lodash';

import { InvalidRelationError } from '../errors';
import type { ID } from '../types';

interface Link {
  id: ID;
  position?: { before?: ID; after?: ID; start?: true; end?: true };
  order?: number;
}

interface OrderedLink extends Link {
  init?: boolean;
  order: number;
}

/**
 * When connecting relations, the order you connect them matters.
 *
 * Example, if you connect the following relations:
 *   { id: 5, position: { before: 1 } }
 *   { id: 1, position: { before: 2 } }
 *   { id: 2, position: { end: true } }
 *
 * Going through the connect array, id 5 has to be connected before id 1,
 * so the order of id5 = id1 - 1. But the order value of id 1 is unknown.
 * The only way to know the order of id 1 is to connect it first.
 *
 * This function makes sure the relations are connected in the right order:
 *   { id: 2, position: { end: true } }
 *   { id: 1, position: { before: 2 } }
 *   { id: 5, position: { before: 1 } }
 *
 */
const sortConnectArray = (connectArr: Link[], initialArr: Link[] = [], strictSort = true) => {
  const sortedConnect: Link[] = [];
  // Boolean to know if we have to recalculate the order of the relations
  let needsSorting = false;
  // Map to validate if relation is already in sortedConnect or DB.
  const relationInInitialArray = initialArr.reduce(
    (acc, rel) => ({ ...acc, [rel.id]: true }),
    {} as Record<ID, boolean>
  );
  // Map to store the first index where a relation id is connected
  const mappedRelations = connectArr.reduce(
    (mapper, relation: Link) => {
      const adjacentRelId = relation.position?.before || relation.position?.after;

      if (!adjacentRelId || (!relationInInitialArray[adjacentRelId] && !mapper[adjacentRelId])) {
        needsSorting = true;
      }

      // If the relation is already in the array, throw an error
      if (mapper[relation.id]) {
        throw new InvalidRelationError(
          `The relation with id ${relation.id} is already connected. ` +
            'You cannot connect the same relation twice.'
        );
      }

      return {
        [relation.id]: { ...relation, computed: false },
        ...mapper,
      };
    },
    {} as Record<ID, Link & { computed: boolean }>
  );

  // If we don't need to sort the connect array, we can return it as is
  if (!needsSorting) return connectArr;

  // Recursively compute in which order the relation should be connected
  const computeRelation = (relation: Link, relationsSeenInBranch: Record<ID, boolean>) => {
    const adjacentRelId = relation.position?.before || relation.position?.after;
    const adjacentRelation = mappedRelations[adjacentRelId as ID];

    // If the relation has already been seen in the current branch,
    // it means there is a circular reference
    if (adjacentRelId && relationsSeenInBranch[adjacentRelId]) {
      throw new InvalidRelationError(
        'A circular reference was found in the connect array. ' +
          'One relation is trying to connect before/after another one that is trying to connect before/after it'
      );
    }

    // This relation has already been computed
    if (mappedRelations[relation.id]?.computed) {
      return;
    }

    mappedRelations[relation.id].computed = true;

    // Relation does not have a before or after attribute or is in the initial array
    if (!adjacentRelId || relationInInitialArray[adjacentRelId]) {
      sortedConnect.push(relation);
      return;
    }

    // Look if id is referenced elsewhere in the array
    if (mappedRelations[adjacentRelId]) {
      computeRelation(adjacentRelation, { ...relationsSeenInBranch, [relation.id]: true });
      sortedConnect.push(relation);
    } else if (strictSort) {
      // If we reach this point, it means that the adjacent relation is not in the connect array
      // and it is not in the database.
      throw new InvalidRelationError(
        `There was a problem connecting relation with id ${
          relation.id
        } at position ${JSON.stringify(
          relation.position
        )}. The relation with id ${adjacentRelId} needs to be connected first.`
      );
    } else {
      // We are in non-strict mode so we can push the relation.
      sortedConnect.push({ id: relation.id, position: { end: true } });
    }
  };

  // Iterate over connectArr and populate sortedConnect
  connectArr.forEach((relation) => computeRelation(relation, {}));

  return sortedConnect;
};

/**
 * Responsible for calculating the relations order when connecting them.
 *
 * The connect method takes an array of relations with positional attributes:
 * - before: the id of the relation to connect before
 * - after: the id of the relation to connect after
 * - end: it should be at the end
 * - start: it should be at the start
 *
 * Example:
 *  - Having a connect array like:
 *      [ { id: 4, before: 2 }, { id: 4, before: 3}, {id: 5, before: 4} ]
 * - With the initial relations:
 *      [ { id: 2, order: 4 }, { id: 3, order: 10 } ]
 * - Step by step, going through the connect array, the array of relations would be:
 *      [ { id: 4, order: 3.5 }, { id: 2, order: 4 }, { id: 3, order: 10 } ]
 *      [ { id: 2, order: 4 }, { id: 4, order: 3.5 }, { id: 3, order: 10 } ]
 *      [ { id: 2, order: 4 }, { id: 5, order: 3.5 },  { id: 4, order: 3.5 }, { id: 3, order: 10 } ]
 * - The final step would be to recalculate fractional order values.
 *      [ { id: 2, order: 4 }, { id: 5, order: 3.33 },  { id: 4, order: 3.66 }, { id: 3, order: 10 } ]
 *
 * @param {Array<*>} initArr - array of relations to initialize the class with
 * @param {string} idColumn - the column name of the id
 * @param {string} orderColumn - the column name of the order
 * @param {boolean} strict - if true, will throw an error if a relation is connected adjacent to
 *                               another one that does not exist
 * @return {*}
 */
const relationsOrderer = <TRelation extends Record<string, ID | number | null>>(
  initArr: TRelation[],
  idColumn: keyof TRelation,
  orderColumn: keyof TRelation,
  strict?: boolean
) => {
  const computedRelations: OrderedLink[] = castArray(initArr ?? []).map((r) => ({
    init: true,
    id: r[idColumn] as ID,
    order: Number(r[orderColumn]) || 1,
  }));

  const maxOrder = maxBy('order', computedRelations)?.order || 0;

  const findRelation = (id: ID) => {
    const idx = computedRelations.findIndex((r) => r.id === id);
    return { idx, relation: computedRelations[idx] };
  };

  const removeRelation = (r: Link) => {
    const { idx } = findRelation(r.id);
    if (idx >= 0) {
      computedRelations.splice(idx, 1);
    }
  };

  const insertRelation = (r: Link) => {
    let idx;

    if (r.position?.before) {
      const { idx: _idx, relation } = findRelation(r.position.before);
      if (relation.init) {
        r.order = relation.order - 0.5;
      } else {
        r.order = relation.order;
      }
      idx = _idx;
    } else if (r.position?.after) {
      const { idx: _idx, relation } = findRelation(r.position.after);
      if (relation.init) {
        r.order = relation.order + 0.5;
      } else {
        r.order = relation.order;
      }

      idx = _idx + 1;
    } else if (r.position?.start) {
      r.order = 0.5;
      idx = 0;
    } else {
      r.order = maxOrder + 0.5;
      idx = computedRelations.length;
    }

    // Insert the relation in the array
    computedRelations.splice(idx, 0, r as OrderedLink);
  };

  return {
    disconnect(relations: Link | Link[]) {
      castArray(relations).forEach((relation) => {
        removeRelation(relation);
      });
      return this;
    },
    connect(relations: Link | Link[]) {
      sortConnectArray(castArray(relations), computedRelations, strict).forEach((relation) => {
        this.disconnect(relation);

        try {
          insertRelation(relation);
        } catch (err) {
          throw new Error(
            `There was a problem connecting relation with id ${
              relation.id
            } at position ${JSON.stringify(
              relation.position
            )}. The list of connect relations is not valid`
          );
        }
      });
      return this;
    },
    get() {
      return computedRelations;
    },
    /**
     * Get a map between the relation id and its order
     */
    getOrderMap() {
      return _(computedRelations)
        .groupBy('order')
        .reduce(
          (acc, relations) => {
            if (relations[0]?.init) return acc;
            relations.forEach((relation, idx) => {
              acc[relation.id] = Math.floor(relation.order) + (idx + 1) / (relations.length + 1);
            });
            return acc;
          },
          {} as Record<ID, number>
        );
    },
  };
};

export { relationsOrderer, sortConnectArray };
