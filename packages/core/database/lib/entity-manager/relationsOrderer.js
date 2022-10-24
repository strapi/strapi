'use strict';

const _ = require('lodash/fp');

// TODO: Document this class properly
/* Constraints:
  - Expects you will never connect a relation before / after one that does not exist
  - Expect the last initArr element to be the last relation in the database
*/
class FractionalOrderer {
  constructor(initArr, idColumn, orderColumn) {
    this.arr = _.castArray(initArr || []).map((r) => ({
      init: true,
      id: r[idColumn],
      order: r[orderColumn],
    }));
  }

  _updateRelationOrder(r) {
    let idx;
    // TODO: Throw if the relation does not exist
    if (r.before) {
      const { idx: _idx, relation } = this.findRelation(r.before);
      if (relation.init) r.order = relation.order - 0.5;
      else r.order = relation.order;
      idx = _idx;
    } else if (r.after) {
      const { idx: _idx, relation } = this.findRelation(r.after);
      if (relation.init) r.order = relation.order + 0.5;
      else r.order = relation.order;
      idx = _idx + 1;
    } else if (r.start) {
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

      const { relation: _relation, idx } = this._updateRelationOrder(relation);

      // Add to the chunk
      this.arr.splice(idx, 0, _relation);
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

module.exports = FractionalOrderer;
