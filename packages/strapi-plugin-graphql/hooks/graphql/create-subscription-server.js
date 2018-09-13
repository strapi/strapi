const _ = require('lodash');
const { SubscriptionServer } = require('subscriptions-transport-ws');
const { execute, subscribe } = require('graphql');

const getUserFromParams = async connectionParams => {
  if (_.isEmpty(connectionParams) || _.isEmpty(connectionParams.Authorization)) {
    throw new Error('Missing Bearer Token');
  }

  const token = await strapi.plugins['users-permissions'].services.jwt.retrieveToken(connectionParams.Authorization);
  const { id, _id } = await strapi.plugins['users-permissions'].services.jwt.verify(token);

  if ((id || _id) === undefined) {
    throw new Error('Invalid token: Token did not contain required fields');
  }

  const user = strapi.query('user', 'users-permissions').findOne({ _id, id });
  if (!user) {
    throw new Error('User is not found');
  }

  return user;
};

/**
 * Create a subscription server based on an exisiting express.js server
 */
const createSubscriptionsServer = (server, schema, path) => {
  // Start subscriptions server
  return SubscriptionServer.create(
    {
      execute,
      subscribe,
      schema,
      onConnect: async (connectionParams, rawSocket, context) => {
        const user = await getUserFromParams(connectionParams);
        return {
          user,
          context
        };
      },
    },
    {
      server,
      path,
    }
  );
};

module.exports = createSubscriptionsServer;
