const _ = require('lodash');
const { buildQueryJoins, buildQueryFilter } = require('./query-utils');

class Query {
  constructor(model) {
    this.model = model;
    this.query = this.model.aggregate();
    this.postProcessFns = [];

    // Binding
    this.executePostProcessors = this.executePostProcessors.bind(this);
    this.clearPostProcessors = this.clearPostProcessors.bind(this);
  }

  buildQuery(filter) {
    return buildQueryFilter(this.model, filter.where);
  }

  thru(cb) {
    this.query = cb(this.query);

    return this;
  }

  where(filter) {
    this.query = this.query.append(this.buildQuery(filter));

    return this;
  }

  find(filter) {
    this.query = this.query.append(this.buildQuery(filter));
    if (!_.isEmpty(filter.sort)) this.query.sort(filter.sort);
    if (_.has(filter, 'start')) this.query.skip(filter.start);
    if (_.has(filter, 'limit')) this.query.limit(filter.limit);

    return this;
  }

  count(filter) {
    if (filter) {
      this.where(filter);
    }
    this.query = this.query.count('count');

    // Format the output of the count stage
    this.postProcessFns.push((result) => _.get(result, `0.count`, 0));

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
    const result = this.query
      .then(this.executePostProcessors)
      .finally(this.clearPostProcessors); // Clear the postProcessors functions
    return result;
  }

  executePostProcessors(result) {
    return _.flow(this.postProcessFns)(result);
  }

  clearPostProcessors() {
    this.postProcessFns = [];
  }
}

module.exports = {
  Query,
};
