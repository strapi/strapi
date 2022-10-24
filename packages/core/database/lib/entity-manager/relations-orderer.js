'use strict';

const _ = require('lodash/fp');

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
 *      [  { id: 4, before: 2 }, { id: 4, before: 3}, {id: 5, before: 4} ]
 * - With the initial relations:
 *      [ { id: 2, order: 4 }, { id: 3, order: 10 } ]
 * - Step by step, going through the connect array, the array of relations would be:
 *      [ { id: 4, order: 3.5 }, { id: 2, order: 4 }, { id: 3, order: 10 } ]
 *      [ { id: 2, order: 4 }, { id: 4, order: 3.5 }, { id: 3, order: 10 } ]
 *      [ { id: 2, order: 4 }, {id: 5, order: 3.5},  { id: 4, order: 3.5 }, { id: 3, order: 10 } ]
 * - The final step would be to recalculate fractional order values.
 *      [ { id: 2, order: 4 }, {id: 5, order: 3.33},  { id: 4, order: 3.66 }, { id: 3, order: 10 } ]
 *
 * Constraints:
 * - Expects you will never connect a relation before / after one that does not exist
 * - Expect the last initArr to have any relations referenced
 *   in the positional attributes & the last relation in the database.
 *
 */
class RelationsOrderer {
  /**
   * @param {Array<*>} initArr - array of relations to initialize the class with
   * @param {string} idColumn - the column name of the id
   * @param {string} orderColumn - the column name of the order
   */
  constructor(initArr, idColumn, orderColumn) {
    this.arr = _.castArray(initArr || []).map((r) => ({
      init: true,
      id: r[idColumn],
      order: r[orderColumn],
    }));
  }

  _updateRelationOrder(r) {
    let idx;
    if (r.position?.before) {
      const { idx: _idx, relation } = this.findRelation(r.position.before);
      if (relation.init) r.order = relation.order - 0.5;
      else r.order = relation.order;
      idx = _idx;
    } else if (r.position?.after) {
      const { idx: _idx, relation } = this.findRelation(r.position.after);
      if (relation.init) r.order = relation.order + 0.5;
      else r.order = relation.order;
      idx = _idx + 1;
    } else if (r.position?.start) {
      r.order = 0.5;
      idx = 0;
    } else {
      const lastRelation = this.arr.at(-1);
      // TODO: Use a big number instead of lastRelation.order
      if (lastRelation.init) r.order = lastRelation.order + 0.5;
      else r.order = lastRelation.order;
      idx = this.arr.length;
    }

    return { relation: r, idx };
  }

  // TODO: Improve performance by using a map
  findRelation(id) {
    const idx = this.arr.findIndex((r) => r.id === id);
    return { idx, relation: this.arr[idx] };
  }

  connect(relations) {
    _.castArray(relations).forEach((relation) => {
      this.disconnect(relation);

      try {
        const { relation: _relation, idx } = this._updateRelationOrder(relation);
        // Add to the chunk
        this.arr.splice(idx, 0, _relation);
      } catch (err) {
        throw new Error(
          `Could not connect ${relation.id}, position ${JSON.stringify(
            relation.position
          )} is invalid`
        );
      }
    });
    return this;
  }

  disconnect(relations) {
    _.castArray(relations).forEach((relation) => {
      const { idx } = this.findRelation(relation.id);
      if (idx >= 0) {
        this.arr.splice(idx, 1);
      }
    });
    return this;
  }

  /**
   * Get a map between the relation id and its order
   */
  getOrderMap() {
    return _(this.arr)
      .groupBy('order')
      .reduce((acc, relations) => {
        if (relations.at(0).init) return acc;
        relations.forEach((relation, idx) => {
          acc[relation.id] = Math.floor(relation.order) + (idx + 1) / (relations.length + 1);
        });
        return acc;
      }, {});
  }
}

module.exports = RelationsOrderer;
