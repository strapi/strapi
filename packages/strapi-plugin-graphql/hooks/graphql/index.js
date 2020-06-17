'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const { ApolloServer } = require('apollo-server-koa');
const depthLimit = require('graphql-depth-limit');
const loadConfigs = require('./load-config');

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
        playground: false,
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
    },
  };
};

/**
 * Merges a  list of schemas
 * @param {Array<Object>} schemas - The list of schemas to merge
 */
const mergeSchemas = schemas => {
  return schemas.reduce((acc, el) => {
    const { definition, query, mutation, type, resolver } = el;

    return _.merge(acc, {
      definition: `${acc.definition || ''} ${definition || ''}`,
      query: `${acc.query || ''} ${query || ''}`,
      mutation: `${acc.mutation || ''} ${mutation || ''}`,
      type,
      resolver,
    });
  }, {});
};
