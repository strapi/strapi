'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const { ApolloServer } = require('apollo-server-koa');
const depthLimit = require('graphql-depth-limit');
const loadConfigs = require('./load-config');

const { SubscriptionServer } = require('subscriptions-transport-ws');
const { execute, subscribe } = require('graphql');

const attachMetadataToResolvers = (schema, { api, plugin }) => {
  const { resolver = {} } = schema;
  if (_.isEmpty(resolver)) return schema;

  Object.keys(resolver).forEach(type => {
    if (!_.isPlainObject(resolver[type])) return;

    Object.keys(resolver[type]).forEach(resolverName => {
      if (!_.isPlainObject(resolver[type][resolverName])) return;

      resolver[type][resolverName]['_metadatas'] = {
        api,
        plugin,
      };
    });
  });

  return schema;
};

module.exports = strapi => {
  const { appPath, installedPlugins } = strapi.config;

  return {
    async beforeInitialize() {
      // Try to inject this hook just after the others hooks to skip the router processing.
      if (!strapi.config.get('hook.load.after')) {
        _.set(strapi.config.hook.load, 'after', []);
      }

      strapi.config.hook.load.after.push('graphql');
      // Load core utils.

      const { api, plugins, extensions } = await loadConfigs({
        appPath,
        installedPlugins,
      });
      _.merge(strapi, { api, plugins });

      /*
       * Create a merge of all the GraphQL configuration.
       */
      const apisSchemas = Object.keys(strapi.api || {}).map(key => {
        const schema = _.get(strapi.api[key], 'config.schema.graphql', {});
        return attachMetadataToResolvers(schema, { api: key });
      });

      const pluginsSchemas = Object.keys(strapi.plugins || {}).map(key => {
        const schema = _.get(strapi.plugins[key], 'config.schema.graphql', {});
        return attachMetadataToResolvers(schema, { plugin: key });
      });

      const extensionsSchemas = Object.keys(extensions || {}).map(key => {
        const schema = _.get(extensions[key], 'config.schema.graphql', {});
        return attachMetadataToResolvers(schema, { plugin: key });
      });

      const baseSchema = mergeSchemas([...apisSchemas, ...pluginsSchemas, ...extensionsSchemas]);

      // save the final schema in the plugin's config
      _.set(strapi, ['plugins', 'graphql', 'config', '_schema', 'graphql'], baseSchema);
    },

    initialize() {
      const { typeDefs, resolvers } = strapi.plugins.graphql.services[
        'schema-generator'
      ].generateSchema();

      if (_.isEmpty(typeDefs)) {
        strapi.log.warn('The GraphQL schema has not been generated because it is empty');

        return;
      }

      const serverParams = {
        typeDefs,
        resolvers,
        context: ({ ctx }) => {
          // Initiliase loaders for this request.
          // TODO: set loaders in the context not globally

          strapi.plugins.graphql.services['data-loaders'].initializeLoader();

          return {
            context: ctx,
          };
        },
        formatError: err => {
          const formatError = _.get(strapi.plugins.graphql, 'config.formatError', null);

          return typeof formatError === 'function' ? formatError(err) : err;
        },
        validationRules: [depthLimit(strapi.plugins.graphql.config.depthLimit)],
        tracing: _.get(strapi.plugins.graphql, 'config.tracing', false),
        debug: _.get(strapi.plugins.graphql, 'config.debug', false),
        playground: _.get(strapi.plugins.graphql, 'config.playgroundAlways', false),
        cors: false,
        bodyParserConfig: true,
        introspection: _.get(strapi.plugins.graphql, 'config.introspection', true),
      };

      // Disable GraphQL Playground in production environment.
      if (
        strapi.config.environment !== 'production' ||
        strapi.plugins.graphql.config.playgroundAlways
      ) {
        serverParams.playground = {
          endpoint: `${strapi.config.server.url}${strapi.plugins.graphql.config.endpoint}`,
          shareEnabled: strapi.plugins.graphql.config.shareEnabled,
        };
      }

      const server = new ApolloServer(serverParams);

      server.applyMiddleware({
        app: strapi.app,
        path: strapi.plugins.graphql.config.endpoint,
      });

      strapi.ws = {};
      strapi.ws.graphql = SubscriptionServer.create(
        {
          schema: server.schema,
          execute,
          subscribe,
          onConnect: async (connectionParams, webSocket) => {
            let id;

            const ctx = {
              state: {},
            };

            strapi.plugins.graphql.services['data-loaders'].initializeLoader();

            try {
              let token =
                connectionParams.authToken || connectionParams.Authorization.split(' ')[1];
              let jwt = await strapi.plugins['users-permissions'].services.jwt.verify(token);
              id = jwt.id;
            } catch (err) {
              webSocket.user = {
                role: await strapi
                  .query('role', 'users-permissions')
                  .findOne({ type: 'public' }, []),
              };
              return Promise.resolve(ctx);
            }

            const populate = strapi.plugins['users-permissions'].models.user.associations
              .filter(ast => ast.autoPopulate !== false)
              .map(ast => ast.alias);

            let user = await strapi.plugins['users-permissions'].services.user.findOne(
              { id },
              populate
            );
            user.id = user.id ? user.id : user._id.toString();

            webSocket.user = user;

            if (!user) {
              return Promise.resolve(ctx);
            }

            if (user.blocked) {
              throw new Error('Auth.form.error.blocked');
            }

            return Promise.resolve(ctx);
          },
          onOperation: (message, params, webSocket) => {
            params.context.state.user = webSocket.user;

            const ctx = Object.assign(
              {
                app: {
                  createContext(req, res) {
                    return ctx;
                  },
                },
                req: {
                  headers: {
                    'x-forwarded-for': webSocket._socket.remoteAddress,
                  },
                },
                is: prop => {
                  return false;
                },
                send: res => {
                  ctx.body = res;
                },
                set: (header, value) => {
                  ctx.response = ctx.response || {};
                  ctx.response.headers = ctx.response.headers || {};
                  ctx.response.headers[header] = value;
                },
                unauthorized(a, b, c) {
                  var error = b.map ? b.map(x => x.messages.map(y => y.id)).join(' ') : b;
                  throw new Error(error);
                },
                badRequest: (a, b, c) => {
                  var error = b
                    ? b.map
                      ? b.map(x => x.messages.map(y => y.id || y.message)).join(' ')
                      : b
                    : a;
                  throw new Error(error);
                },
                forbidden: error => {
                  throw new Error('forbidden');
                },
                ws: webSocket,
              },
              _.clone(params.context),
              {
                request: Object.assign(
                  _.clone(params.context && params.context.request ? params.context.request : {}),
                  {
                    ip: webSocket._socket.remoteAddress,
                  }
                ),
                headers: {
                  fingerprint: params.context.fingerPrint,
                  authorization: webSocket.token,
                },
              }
            );
            delete params.context;
            return { ...params, context: { context: ctx } };
          },
          onOperationComplete: webSocket => {
            // ...
          },
          onDisconnect: (webSocket, context) => {
            // ...
          },
        },
        {
          noServer: true,
          path: strapi.plugins.graphql.config.endpoint,
        }
      );

      //TODO: Need refactoring
      //It is a DIRTY way to handle server upgrade request
      //this need to be called once server has started, so it need a bit of refactoring in order to handle it in a more cleanly manner
      //at this point strapi.server is still not populatet, so we wait until strapi gets initialized and we set the 'upgrage' ws handler
      var _serverInitInterval = setInterval(() => {
        if (!strapi.server) return;

        clearInterval(_serverInitInterval);
        strapi.server.on('upgrade', (request, socket, head) => {
          const pathname = request.url;
          if (pathname.startsWith(strapi.plugins.graphql.config.endpoint)) {
            strapi.ws.graphql.wsServer.handleUpgrade(request, socket, head, ws => {
              strapi.ws.graphql.wsServer.emit('connection', ws);
            });
          }
        });
      }, 1000);
    },
  };
};

/**
 * Merges a  list of schemas
 * @param {Array<Object>} schemas - The list of schemas to merge
 */
const mergeSchemas = schemas => {
  return schemas.reduce((acc, el) => {
    const { definition, query, mutation, subscription, type, resolver } = el;

    return _.merge(acc, {
      definition: `${acc.definition || ''} ${definition || ''}`,
      query: `${acc.query || ''} ${query || ''}`,
      mutation: `${acc.mutation || ''} ${mutation || ''}`,
      subscription: `${acc.subscription || ''} ${subscription || ''}`,
      type,
      resolver,
    });
  }, {});
};
