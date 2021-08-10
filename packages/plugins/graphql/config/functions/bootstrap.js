'use strict';

const _ = require('lodash');
const { ApolloServer } = require('apollo-server-koa');
const depthLimit = require('graphql-depth-limit');
const { graphqlUploadKoa } = require('graphql-upload');

module.exports = ({ strapi }) => {
  const schema = strapi.plugins.graphql.services.schema(strapi).generateContentAPISchema();

  if (_.isEmpty(schema)) {
    strapi.log.warn('The GraphQL schema has not been generated because it is empty');

    return;
  }

  const config = _.get(strapi.plugins.graphql, 'config', {});

  // TODO: Remove these deprecated options in favor of `apolloServer` in the next major version
  const deprecatedApolloServerConfig = {
    tracing: _.get(config, 'tracing', false),
    introspection: _.get(config, 'introspection', true),
    engine: _.get(config, 'engine', false),
  };

  if (['tracing', 'introspection', 'engine'].some(key => _.has(config, key))) {
    strapi.log.warn(
      'The `tracing`, `introspection` and `engine` options are deprecated in favor of the `apolloServer` object and they will be removed in the next major version.'
    );
  }

  const apolloServerConfig = _.get(config, 'apolloServer', {});

  const serverParams = {
    schema,
    uploads: false,
    context: ({ ctx }) => {
      // Initialize loaders for this request.
      // TODO: set loaders in the context not globally

      strapi.plugins.graphql.services.old['data-loaders'].initializeLoader();

      return {
        context: ctx,
      };
    },
    formatError: err => {
      const formatError = _.get(config, 'formatError', null);

      return typeof formatError === 'function' ? formatError(err) : err;
    },
    validationRules: [depthLimit(config.depthLimit)],
    playground: false,
    cors: false,
    bodyParserConfig: true,
    // TODO: Remove these deprecated options in favor of `apolloServerConfig` in the next major version
    ...deprecatedApolloServerConfig,
    ...apolloServerConfig,
  };

  // Disable GraphQL Playground in production environment.
  if (strapi.config.environment !== 'production' || config.playgroundAlways) {
    serverParams.playground = {
      endpoint: `${strapi.config.server.url}${config.endpoint}`,
      shareEnabled: config.shareEnabled,
    };
  }

  const server = new ApolloServer(serverParams);

  const uploadMiddleware = graphqlUploadKoa();
  strapi.app.use((ctx, next) => {
    if (ctx.path === config.endpoint) {
      return uploadMiddleware(ctx, next);
    }

    return next();
  });

  server.start().then(() => {
    server.applyMiddleware({
      app: strapi.app,
      path: config.endpoint,
    });
  });

  strapi.plugins.graphql.destroy = async () => {
    await server.stop();
  };
};
