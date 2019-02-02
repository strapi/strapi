const _ = require('lodash');
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
    if (!_.isEmpty(filter.sort)) this.query.sort(filter.sort);
    if (_.has(filter, 'start')) this.query.skip(filter.start);
    if (_.has(filter, 'limit')) this.query.limit(filter.limit);

    return this;
  }

  count(filter) {
    this.query = this.buildQuery(filter);
    this.query = this.query
      .count("count")
      .then(result => _.get(result, `0.count`, 0));
    return this;
  }

  populate(populate) {
    const queryJoins = buildQueryJoins(this.model, { whitelistedPopulate: populate });
    const existingPipelines = this.query.pipeline();
    // Remove redundant joins
    const differenceJoins = _.differenceWith(queryJoins, existingPipelines, _.isEqual);
    this.query = this.query.append(differenceJoins);
    return this;
  }

  execute() {
    return this.query;
  }
}

module.exports = {
  Query,
};
