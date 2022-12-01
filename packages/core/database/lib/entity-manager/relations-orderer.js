'use strict';

const _ = require('lodash/fp');

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
const sortConnectArray = (connectArr, initialArr = []) => {
  const sortedConnect = [];
  // Map to validate if relation is already in sortedConnect or DB.
  const relInArray = initialArr.reduce((acc, rel) => ({ ...acc, [rel.id]: true }), {});
  // Map to validate if connect relation has already been computed
  const computedIdx = {};
  // Map to store the first index where a relation id is connected
  const firstSeen = {};

  // Populate firstSeen
  connectArr.forEach((rel, idx) => {
    if (!(rel.id in firstSeen)) firstSeen[rel.id] = idx;
  });

  // Iterate over connectArr and populate sortedConnect
  connectArr.forEach((rel, idx) => {
    const pushRelation = (rel) => {
      sortedConnect.push(rel);
      relInArray[rel.id] = true;
    };

    const computeRelation = (rel) => {
      const adjacentRelId = rel.position?.before || rel.position?.after;

      // This connect has already been computed
      if (idx in computedIdx) return;

      if (!adjacentRelId || relInArray[adjacentRelId]) {
        return pushRelation(rel);
      }

      // Look if id is referenced elsewhere in the array
      const adjacentRelIdx = firstSeen[adjacentRelId];
      if (adjacentRelIdx) {
        const adjacentRel = connectArr[adjacentRelIdx];
        // Mark adjacent relation idx as computed,
        // so it is not computed again later in the loop
        computedIdx[adjacentRelIdx] = true;
        computeRelation(adjacentRel);
        pushRelation(rel);
      }
    };

    computeRelation(rel);
  });

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
 * Constraints:
 * - Expects you will never connect a relation before / after one that does not exist
 * - Expect initArr to have all relations referenced in the positional attributes
 *
 * @param {Array<*>} initArr - array of relations to initialize the class with
 * @param {string} idColumn - the column name of the id
 * @param {string} orderColumn - the column name of the order
 * @return {*}
 */
const relationsOrderer = (initArr, idColumn, orderColumn) => {
  const arr = _.castArray(initArr || []).map((r) => ({
    init: true,
    id: r[idColumn],
    order: r[orderColumn],
  }));

  const maxOrder = _.maxBy('order', arr)?.order || 0;

  const findRelation = (id) => {
    const idx = arr.findIndex((r) => r.id === id);
    return { idx, relation: arr[idx] };
  };

  const removeRelation = (r) => {
    const { idx } = findRelation(r.id);
    if (idx >= 0) {
      arr.splice(idx, 1);
    }
  };

  const insertRelation = (r) => {
    let idx;

    if (r.position?.before) {
      const { idx: _idx, relation } = findRelation(r.position.before);
      if (relation.init) r.order = relation.order - 0.5;
      else r.order = relation.order;
      idx = _idx;
    } else if (r.position?.after) {
      const { idx: _idx, relation } = findRelation(r.position.after);
      if (relation.init) r.order = relation.order + 0.5;
      else r.order = relation.order;
      idx = _idx + 1;
    } else if (r.position?.start) {
      r.order = 0.5;
      idx = 0;
    } else {
      r.order = maxOrder + 0.5;
      idx = arr.length;
    }

    // Insert the relation in the array
    arr.splice(idx, 0, r);
  };

  return {
    disconnect(relations) {
      _.castArray(relations).forEach((relation) => {
        removeRelation(relation);
      });
      return this;
    },
    connect(relations) {
      const sortedRelations = sortConnectArray(relations, arr);
      sortedRelations.forEach((relation) => {
        this.disconnect(relation);

        try {
          insertRelation(relation);
        } catch (err) {
          strapi.log.error(err);
          throw new Error(
            `Could not connect ${relation.id}, position ${JSON.stringify(
              relation.position
            )} is invalid`
          );
        }
      });
      return this;
    },
    get() {
      return arr;
    },
    /**
     * Get a map between the relation id and its order
     */
    getOrderMap() {
      return _(arr)
        .groupBy('order')
        .reduce((acc, relations) => {
          if (relations[0]?.init) return acc;
          relations.forEach((relation, idx) => {
            acc[relation.id] = Math.floor(relation.order) + (idx + 1) / (relations.length + 1);
          });
          return acc;
        }, {});
    },
  };
};

module.exports = { relationsOrderer, sortConnectArray };
