
const _ = require('lodash');
const { withFilter } = require('graphql-subscriptions');

const policyUtils = require('strapi-utils').policy;
const pubsub = require('../utils/pubsub');

module.exports = {
  composeSubscribeResolver: function (_schema, plugin, name, eventType) {
    const queryName = `${name}${_.capitalize(eventType)}`;
    const { resolver: handler = {} } = _schema;

    // Retrieve policies.
    const policies = _.get(handler, `Subscription.${queryName}.policies`, []);

    return {
      subscribe: withFilter(() => pubsub.asyncIterator(queryName), async (payload, variables, { context, user }) => {
        const policiesFn = [];
        // Populate policies.
        policies.forEach(policy => policyUtils.get(policy, plugin, policiesFn, `GraphQL query "${queryName}"`, name));

        // Hack to be able to handle permissions for each query.
        const ctx = {
          ...context,
          request: {
            ...context.request,
            graphql: null
          },
          state: {
            ...context.state,
            user,
            payload: payload[queryName],
            variables: variables.where,
          }
        };

        // Execute policies stack.
        const policy = await strapi.koaMiddlewares.compose(policiesFn)(ctx);

        // Policy doesn't always return errors but they update the current context.
        if (_.isError(ctx.request.graphql) || _.get(ctx.request.graphql, 'isBoom')) {
          return ctx.request.graphql;
        }

        // Something went wrong in the policy.
        if (policy) {
          return policy;
        }


        if (_.isEmpty(variables)) return true;
        return _.some([payload[queryName]], variables.where);
      })
    };
  }
};
