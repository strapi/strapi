import { isEmpty, mergeWith, isArray } from 'lodash/fp';
import { ApolloServer } from 'apollo-server-koa';
import {
  ApolloServerPluginLandingPageDisabled,
  ApolloServerPluginLandingPageGraphQLPlayground,
} from 'apollo-server-core';
import depthLimit from 'graphql-depth-limit';
import { graphqlUploadKoa } from 'graphql-upload';
import type { Config } from 'apollo-server-core';
import type { Strapi } from '@strapi/types';

import { formatGraphqlError } from './format-graphql-error';

const merge = mergeWith((a, b) => {
  if (isArray(a) && isArray(b)) {
    return a.concat(b);
  }
});

/**
 * Register the upload middleware powered by graphql-upload in Strapi
 * @param {object} strapi
 * @param {string} path
 */
const useUploadMiddleware = (strapi: Strapi, path: string): void => {
  const uploadMiddleware = graphqlUploadKoa();

  strapi.server.app.use((ctx, next) => {
    if (ctx.path === path) {
      return uploadMiddleware(ctx, next);
    }

    return next();
  });
};

export async function bootstrap({ strapi }: { strapi: Strapi }) {
  // Generate the GraphQL schema for the content API
  const schema = strapi.plugin('graphql').service('content-api').buildSchema();

  if (isEmpty(schema)) {
    strapi.log.warn('The GraphQL schema has not been generated because it is empty');

    return;
  }

  const { config } = strapi.plugin('graphql');

  const path: string = config('endpoint');

  const defaultServerConfig: Config & {
    cors: boolean;
    uploads: boolean;
    bodyParserConfig: boolean;
  } = {
    // Schema
    schema,

    // Initialize loaders for this request.
    context: ({ ctx }) => ({
      state: ctx.state,
      koaContext: ctx,
    }),

    // Validation
    validationRules: [depthLimit(config('depthLimit') as number) as any],

    // Errors
    formatError: formatGraphqlError,

    // Misc
    cors: false,
    uploads: false,
    bodyParserConfig: true,

    plugins: [
      process.env.NODE_ENV === 'production' && !config('playgroundAlways')
        ? ApolloServerPluginLandingPageDisabled()
        : ApolloServerPluginLandingPageGraphQLPlayground(),
    ],

    cache: 'bounded' as const,
  };

  const serverConfig = merge(defaultServerConfig, config('apolloServer'));

  // Create a new Apollo server
  const server = new ApolloServer(serverConfig);

  // Register the upload middleware
  useUploadMiddleware(strapi, path);

  try {
    // Since Apollo-Server v3, server.start() must be called before using server.applyMiddleware()
    await server.start();
  } catch (error) {
    if (error instanceof Error) {
      strapi.log.error('Failed to start the Apollo server', error.message);
    }

    throw error;
  }

  // Link the Apollo server & the Strapi app
  strapi.server.routes([
    {
      method: 'ALL',
      path,
      handler: [
        (ctx, next) => {
          ctx.state.route = {
            info: {
              // Indicate it's a content API route
              type: 'content-api',
            },
          };

          return strapi.auth.authenticate(ctx, next);
        },

        // Apollo Server
        server.getMiddleware({
          path,
          cors: serverConfig.cors,
          bodyParserConfig: serverConfig.bodyParserConfig,
        }),
      ],
      config: {
        auth: false,
      },
    },
  ]);

  // Register destroy behavior
  // We're doing it here instead of exposing a destroy method to the strapi-server.js
  // file since we need to have access to the ApolloServer instance
  strapi.plugin('graphql').destroy = async () => {
    await server.stop();
  };
}
