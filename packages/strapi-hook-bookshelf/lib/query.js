const { has, isEmpty } = require('lodash');
const { buildQueryJoins, buildQueryFilter } = require('./query-utils');

class Query {
  constructor(model) {
    this.model = model;
  }

  buildQuery(query) {
    return (filter) => {
      // Generate stages.
      buildQueryJoins(query)(this.model, filter.where);
      buildQueryFilter(query)(this.model, filter.where);
    };
  }

  find(filter, withRelated = []) {
    this.query = this.model
      .query((qb) => {
        this.buildQuery(qb)(filter);

        if (has(filter, 'start')) qb.offset(filter.start);
        if (has(filter, 'limit')) qb.limit(filter.limit);
        if (!isEmpty(filter.sort)) {
          qb.orderBy(filter.sort.key, filter.sort.order);
        }
      })
      .fetchAll({ withRelated })
      .then((records) => records ? records.toJSON() : records);

    return this;
  }

  count(filter) {
    this.query = this.model
      .query((qb) => {
        this.buildQuery(qb)(filter);
      })
      .count();
    return this;
  }

  execute() {
    return this.query;
  }
}

module.exports = {
  Query,
};
