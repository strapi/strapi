const { has, isEmpty, get } = require('lodash');
const { buildQueryJoins, buildQueryFilter } = require('./query-utils');

class Query {
  constructor(model) {
    this.model = model;
  }

  buildQuery(filter) {
    const filterStage = buildQueryFilter(this.model, filter.where);
    const query = this.model.aggregate(filterStage);

    return query;
  }

  find(filter) {
    this.query = this.buildQuery(filter);
    if (!isEmpty(filter.sort)) this.query.sort(filter.sort);
    if (has(filter, 'start')) this.query.skip(filter.start);
    if (has(filter, 'limit')) this.query.limit(filter.limit);

    return this;
  }

  count(filter) {
    this.query = this.buildQuery(filter);
    this.query = this.query
      .count("count")
      .then(result => get(result, `0.count`, 0));
    return this;
  }

  populate(populate) {
    const queryJoins = buildQueryJoins(this.model, { whitelistedPopulate: populate });
    this.query = this.query.append(queryJoins);
    return this;
  }

  execute() {
    return this.query;
  }
}

module.exports = {
  Query,
};
