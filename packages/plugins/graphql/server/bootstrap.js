'use strict';

const { isEmpty, getOr } = require('lodash/fp');
const { ApolloServer } = require('apollo-server-koa');
const {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} = require('apollo-server-core');
const depthLimit = require('graphql-depth-limit');
const { graphqlUploadKoa } = require('graphql-upload');

module.exports = async strapi => {
  // Generate the GraphQL schema for the content API
  const schema = strapi
    .plugin('graphql')
    .service('content-api')
    .buildSchema();

  if (isEmpty(schema)) {
    strapi.log.warn('The GraphQL schema has not been generated because it is empty');

    return;
  }

  const config = getOr({}, 'config', strapi.plugin('graphql'));
  const apolloServerConfig = getOr({}, 'apolloServer', config);

  const serverParams = {
    // Schema
    schema,

    // Initialize loaders for this request.
    context: ({ ctx }) => {
      // TODO: set loaders in the context not globally
      strapi
        .plugin('graphql')
        .service('old')
        ['data-loaders'].initializeLoader();

      return ctx;
    },

    // Format & validation
    formatError: err => {
      const formatError = getOr(null, 'formatError', config);

      return typeof formatError === 'function' ? formatError(err) : err;
    },
    validationRules: [depthLimit(config.depthLimit)],

    // Misc
    cors: false,
    uploads: false,
    bodyParserConfig: true,

    plugins: [
      // Specify which GraphQL landing page we want for the different env.
      process.env.NODE_ENV !== 'production'
        ? ApolloServerPluginLandingPageLocalDefault({ footer: false })
        : ApolloServerPluginLandingPageProductionDefault({ footer: false }),
    ],
    ...apolloServerConfig,
  };

  // Create a new Apollo server
  const server = new ApolloServer(serverParams);

  // Register the upload middleware
  useUploadMiddleware(strapi, config);

  try {
    // Since Apollo-Server v3, server.start() must be called before using server.applyMiddleware()
    await server.start();
  } catch (e) {
    strapi.log.error('Failed to start the Apollo server', e.message);
  }

  // Link the Apollo server & the Strapi app
  server.applyMiddleware({
    app: strapi.app,
    path: config.endpoint,
  });

  // Register destroy behavior
  // We're doing it here instead of exposing a destroy method to the strapi-server.js
  // file since we need to have access to the ApolloServer instance
  strapi.plugin('graphql').destroy = async () => {
    await server.stop();
  };
};

/**
 * Register the upload middleware powered by graphql-upload in Strapi
 * @param {object} strapi
 * @param {object} config
 */
const useUploadMiddleware = (strapi, config) => {
  const uploadMiddleware = graphqlUploadKoa();

  strapi.app.use((ctx, next) => {
    if (ctx.path === config.endpoint) {
      return uploadMiddleware(ctx, next);
    }

    return next();
  });
};
