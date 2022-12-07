import { isEmpty, mergeWith, isArray } from 'lodash/fp';
import { graphqlUploadKoa } from 'graphql-upload';
import formatGraphqlError from './format-graphql-error';
import Koa, { Context, Next } from 'koa';
import { Strapi } from '@strapi/strapi';
import { createYoga, YogaServerOptions } from 'graphql-yoga';
import koaPlayground from 'graphql-playground-middleware-koa';

const merge = mergeWith((a, b) => {
  if (isArray(a) && isArray(b)) {
    return a.concat(b);
  }
});

/**
 * Register the upload middleware powered by graphql-upload in Strapi
 */
const useUploadMiddleware = (path: string) => {
  const uploadMiddleware = graphqlUploadKoa();

  strapi.server.app.use((ctx: Context, next: Next) => {
    if (ctx.path === path) {
      return uploadMiddleware(ctx, next);
    }

    return next();
  });
};

export default async ({ strapi }: { strapi: Strapi }) => {
  // Generate the GraphQL schema for the content API
  const schema = strapi.plugin('graphql').service('content-api').buildSchema();

  if (isEmpty(schema)) {
    strapi.log.warn('The GraphQL schema has not been generated because it is empty');

    return;
  }

  const { config } = strapi.plugin('graphql');

  const path = config('endpoint');

  const defaultServerConfig: YogaServerOptions<
    Koa.ParameterizedContext<Koa.DefaultState, Koa.DefaultContext, unknown>,
    any
  > = {
    schema,
    graphqlEndpoint: path,
    cors: false,
    logging: true,
    context: (ctx: Context) => {
      return {
        state: ctx.state,
        koaContext: ctx,
      };
    },
    graphiql: !!(process.env.NODE_ENV !== 'production' || config('browserIDEAlways')),
    maskedErrors: {
      maskError(error) {
        return formatGraphqlError(error);
      },
    },
  };

  const serverConfig = merge(defaultServerConfig, config('yogaServer'));

  // TODO: ask the strapi team about it, subscriptions doesn't seem to be working from the client side
  // Handle subscriptions
  if (config('subscriptions')) {
    // const subscriptionServer = SubscriptionServer.create(
    //   { schema, execute, subscribe },
    //   { server: strapi.server.httpServer, path }
    // );
  }

  const graphQLServer = createYoga<Koa.ParameterizedContext>(serverConfig);

  // Register the upload middleware
  useUploadMiddleware(path);

  // Link Yoga server & the Strapi app
  strapi.server.routes([
    {
      method: 'ALL',
      path,
      handler: [
        (ctx: Context, next: Next) => {
          ctx.state.route = {
            info: {
              // Indicate it's a content API route
              type: 'content-api',
            },
          };

          // allow graphql playground to load without authentication
          if (ctx.request.method === 'GET') return next();

          return strapi.auth.authenticate(ctx, next);
        },

        async (ctx: Context, next: Next) => {
          const isGETReq = ctx.method === 'GET';
          const isAlwaysShowBrowserIDE = config('browserIDEAlways');
          const isGraphiQLDisabled = config('browserIDE') !== 'graphiql';
          const isEnvDevelopment = process.env.NODE_ENV !== 'production';

          if (isGETReq && isGraphiQLDisabled && (isEnvDevelopment || isAlwaysShowBrowserIDE)) {
            return koaPlayground({ endpoint: path })(ctx, next);
          }

          // Second parameter adds Koa's context into GraphQL Context
          const response = await graphQLServer.handleNodeRequest(ctx.req, ctx);

          // Set status code
          ctx.status = response.status;

          // Set headers
          response.headers.forEach((value, key) => {
            ctx.append(key, value);
          });

          // Converts ReadableStream to a NodeJS Stream
          ctx.body = response.body;

          // Prevent blocking graphiql yoga resources
          ctx.set('Content-Security-Policy', '*');
        },
      ],
      config: {
        auth: false,
      },
    },
  ]);
};
