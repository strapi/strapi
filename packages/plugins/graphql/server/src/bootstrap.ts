import { isEmpty, mergeWith, isArray, isObject } from 'lodash/fp';
import { ApolloServer, type ApolloServerOptions } from '@apollo/server';
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from '@apollo/server/plugin/landingPage/default';
import { koaMiddleware } from '@as-integrations/koa';
import depthLimit from 'graphql-depth-limit';
// eslint-disable-next-line import/extensions
import graphqlUploadKoa from 'graphql-upload/graphqlUploadKoa.js';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';

import type { Strapi, Common } from '@strapi/types';
import type { BaseContext, Context, Next } from 'koa';

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

  strapi.server.app.use((ctx: Context, next: Next) => {
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

  // TODO: rename playgroundAlways since it's not playground anymore
  const playgroundEnabled = !(process.env.NODE_ENV === 'production' && !config('playgroundAlways'));

  let landingPage;
  if (playgroundEnabled) {
    landingPage = ApolloServerPluginLandingPageLocalDefault();
    strapi.log.debug('Using Apollo sandbox landing page');
  } else {
    landingPage = ApolloServerPluginLandingPageProductionDefault();
    strapi.log.debug('Using Apollo production landing page');
  }

  type CustomOptions = {
    cors: boolean;
    uploads: boolean;
    bodyParserConfig: boolean;
  };

  const defaultServerConfig: ApolloServerOptions<BaseContext> & CustomOptions = {
    // Schema
    schema,

    // Validation
    validationRules: [depthLimit(config('depthLimit') as number) as any],

    // Errors
    formatError: formatGraphqlError,

    // Misc
    cors: false,
    uploads: false,
    bodyParserConfig: true,

    plugins: [landingPage],

    cache: 'bounded' as const,
  };

  const serverConfig = merge(defaultServerConfig, config('apolloServer')) as any;

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

  // Create the route handlers for Strapi
  const handler: Common.MiddlewareHandler[] = [];

  // add cors middleware
  if (cors) {
    handler.push(cors());
  }

  // add koa bodyparser middleware
  if (isObject(serverConfig.bodyParserConfig)) {
    handler.push(bodyParser(serverConfig.bodyParserConfig));
  } else if (serverConfig.bodyParserConfig) {
    handler.push(bodyParser());
  } else {
    handler.push(bodyParser());
    strapi.log.debug('Body parser has been disabled for Apollo server');
  }

  // add the Strapi auth middleware
  handler.push((ctx: Context, next: Next) => {
    ctx.state.route = {
      info: {
        // Indicate it's a content API route
        type: 'content-api',
      },
    };

    // allow graphql playground to load without authentication
    // WARNING: this means graphql should not accept GET requests generally
    // TODO: find a better way and remove this, it is causing issues such as https://github.com/strapi/strapi/issues/19073
    if (ctx.request.method === 'GET') {
      return next();
    }

    return strapi.auth.authenticate(ctx, next);
  });

  // add the graphql server for koa
  handler.push(
    koaMiddleware(server, {
      // Initialize loaders for this request.
      context: async ({ ctx }) => ({
        state: ctx.state,
        koaContext: ctx,
      }),
    })
  );

  // now that handlers are set up, add the graphql route to our koa server
  strapi.server.routes([
    {
      method: 'ALL',
      path,
      handler,
      config: {
        auth: false,
      },
    },
  ]);

  // add a method to check if playground was actually enabled to avoid re-implementing env and config checks
  strapi.plugin('graphql').isPlaygroundEnabled = () => playgroundEnabled;

  // Register destroy behavior
  // We're doing it here instead of exposing a destroy method to the strapi-server.js
  // file since we need to have access to the ApolloServer instance
  strapi.plugin('graphql').destroy = async () => {
    await server.stop();
  };
}
