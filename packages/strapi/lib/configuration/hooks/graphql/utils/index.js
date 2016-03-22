'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const co = require('co');

/**
 * GraphQL utils
 */

module.exports = {

  /**
   * Allow to resolve GraphQL function or not.
   */

  applyPolicies: function (rootValue, type, model, action) {

    // Remove keys added by GraphiQL
    if (strapi.config.graphql.graphiql === true) {
      if (rootValue.context.request.body.hasOwnProperty('query')) {
        delete rootValue.context.request.body.query;
      }

      if (rootValue.context.request.body.hasOwnProperty('variables')) {
        delete rootValue.context.request.body.variables;
      }
    }

    if (type.toLowerCase() === 'queries' || type.toLowerCase() === 'mutations') {
      const policies = _.get(strapi.api, model.toLowerCase() + '.config.graphql.' + type.toLowerCase() + '.' + _.camelCase(action));

      // Invalid model or action.
      if (_.isUndefined(policies)) {
        return Promise.reject();
      } else if (_.isEmpty(policies)) {
        return Promise.resolve();
      } else if (_.size(_.intersection(_.keys(strapi.policies), policies)) !== _.size(policies)) {
        // Some specified policies don't exist
        return Promise.reject('Some specified policies don\'t exist');
      }

      // Wrap generator function into regular function.
      const executePolicy = co.wrap(function * (policy) {
        try {
          let next;

          // Set next variable if `next` function has been called
          yield strapi.policies[policy].apply(rootValue.context, [function * () {
            next = true;
          }]);

          if (_.isUndefined(next)) {
            return yield Promise.reject();
          }

          return yield Promise.resolve();
        } catch (err) {
          return yield Promise.reject(err);
        }
      });

      // Build promises array.
      const arrayOfPromises = _.map(policies, function (policy) {
        return executePolicy(policy);
      });

      return Promise.all(arrayOfPromises);
    }

    return Promise.reject();
  }
};
