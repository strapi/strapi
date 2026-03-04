import { isEmpty, mergeWith, isArray, isObject, isFunction } from 'lodash/fp';
import { ApolloServer, type ApolloServerPlugin, type ApolloServerOptions } from '@apollo/server';
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from '@apollo/server/plugin/landingPage/default';
import { koaMiddleware } from '@as-integrations/koa';
import depthLimit from 'graphql-depth-limit';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';

import type { Core } from '@strapi/types';
import type { Options } from '@koa/cors';
import type { BaseContext, DefaultContextExtends, DefaultStateExtends } from 'koa';

import { formatGraphqlError } from './format-graphql-error';

const merge = mergeWith((a, b) => {
  if (isArray(a) && isArray(b)) {
    return a.concat(b);
  }
});

type StrapiGraphQLContext = BaseContext & {
  rootQueryArgs?: Record<string, unknown>;
};

export const determineLandingPage = (
  strapi: Core.Strapi
): ApolloServerPlugin<StrapiGraphQLContext> => {
  const { config } = strapi.plugin('graphql');
  const utils = strapi.plugin('graphql').service('utils');

  /**
   * configLanding page may be one of the following:
   *
   * - true: always use "playground" even in production
   * - false: never show "playground" even in non-production
   * - undefined: default Apollo behavior (hide playground on production)
   * - a function that returns an Apollo plugin that implements renderLandingPage
   ** */
  const configLandingPage = config('landingPage');

  const isProduction = process.env.NODE_ENV === 'production';

  const localLanding = () => {
    strapi.log.debug('Apollo landing page: local');
    utils.playground.setEnabled(true);
    return ApolloServerPluginLandingPageLocalDefault();
  };

  const prodLanding = () => {
    strapi.log.debug('Apollo landing page: production');
    utils.playground.setEnabled(false);
    return ApolloServerPluginLandingPageProductionDefault();
  };

  const userLanding = (userFunction: (strapi?: Core.Strapi) => ApolloServerPlugin | boolean) => {
    strapi.log.debug('Apollo landing page: from user-defined function...');
    const result = userFunction(strapi);
    if (result === true) {
      return localLanding();
    }
    if (result === false) {
      return prodLanding();
    }
    strapi.log.debug('Apollo landing page: user-defined');
    return result;
  };

  // DEPRECATED, remove in Strapi v6
  const playgroundAlways = config('playgroundAlways');
  if (playgroundAlways !== undefined) {
    strapi.log.warn(
      'The graphql config playgroundAlways is deprecated. This will be removed in Strapi 6. Please use landingPage instead. '
    );
  }
  if (playgroundAlways === false) {
    strapi.log.warn(
      'graphql config playgroundAlways:false has no effect, please use landingPage:false to disable Graphql Playground in all environments'
    );
  }

  if (playgroundAlways || configLandingPage === true) {
    return localLanding();
  }

  // if landing page has been disabled, use production
  if (configLandingPage === false) {
    return prodLanding();
  }

  // If user did not define any settings, use our defaults
  if (configLandingPage === undefined) {
    return isProduction ? prodLanding() : localLanding();
  }

  // if user provided a landing page function, return that
  if (isFunction(configLandingPage)) {
    return userLanding(configLandingPage);
  }

  // If no other setting could be found, default to production settings
  strapi.log.warn(
    'Your Graphql landing page has been disabled because there is a problem with your Graphql settings'
  );
  return prodLanding();
};

export async function bootstrap({ strapi }: { strapi: Core.Strapi }) {
  // Generate the GraphQL schema for the content API
  const schema = strapi.plugin('graphql').service('content-api').buildSchema();

  if (isEmpty(schema)) {
    strapi.log.warn('The GraphQL schema has not been generated because it is empty');

    return;
  }

  const { config } = strapi.plugin('graphql');

  const path: string = config('endpoint');

  const landingPage = determineLandingPage(strapi);
  /**
   * We need the arguments passed to the root query to be available in the association resolver
   * so we can forward those arguments along to any relations.
   *
   * In order to do that we are currently storing the arguments in context.
   * There is likely a better solution, but for now this is the simplest fix we could find.
   *
   * @see https://github.com/strapi/strapi/issues/23524
   */
  const pluginAddRootQueryArgs: ApolloServerPlugin<StrapiGraphQLContext> = {
    async requestDidStart() {
      return {
        async executionDidStart() {
          return {
            willResolveField({ source, args, contextValue, info }) {
              if (!source && info.operation.operation === 'query') {
                // Track which query field set the rootQueryArgs
                const fieldName = info.fieldName;
                // Set rootQueryArgs with the field name that originated it
                contextValue.rootQueryArgs = {
                  ...args,
                  _originField: fieldName, // Track which field set this
                };
              }
            },
          };
        },
      };
    },
  };

  type CustomOptions = {
    cors?: boolean | Options;
    uploads: boolean;
    bodyParserConfig: boolean;
  };

  const defaultServerConfig: ApolloServerOptions<StrapiGraphQLContext> & CustomOptions = {
    // Schema
    schema,

    // Validation
    validationRules: [depthLimit(config('depthLimit') as number) as any],

    // Errors
    formatError: formatGraphqlError,

    // Misc
    cors: undefined,
    uploads: false,
    bodyParserConfig: true,
    // send 400 http status instead of 200 for input validation errors
    status400ForVariableCoercionErrors: true,
    plugins: [landingPage, pluginAddRootQueryArgs],

    cache: 'bounded' as const,
  };

  const serverConfig = merge(
    defaultServerConfig,
    config('apolloServer')
  ) as ApolloServerOptions<StrapiGraphQLContext> & CustomOptions;

  // Create a new Apollo server
  const server = new ApolloServer(serverConfig);

  try {
    // server.start() must be called before using server.applyMiddleware()
    await server.start();
  } catch (error) {
    if (error instanceof Error) {
      strapi.log.error('Failed to start the Apollo server', error.message);
    }

    throw error;
  }

  // Create the route handlers for Strapi
  const handler: Core.MiddlewareHandler[] = [];

  // add cors middleware
  if (serverConfig.cors === false) {
    // Explicitly disabled - don't add middleware
  } else if (serverConfig.cors === undefined || serverConfig.cors === true) {
    // enable with defaults (backwards compatible)
    handler.push(cors());
  } else {
    // Custom options object
    handler.push(cors(serverConfig.cors));
  }

  // add koa bodyparser middleware
  if (isObject(serverConfig.bodyParserConfig)) {
    handler.push(bodyParser(serverConfig.bodyParserConfig));
  } else if (serverConfig.bodyParserConfig) {
    handler.push(bodyParser());
  } else {
    strapi.log.debug('Body parser has been disabled for Apollo server');
  }

  // add the Strapi auth middleware
  handler.push((ctx, next) => {
    ctx.state.route = {
      info: {
        // Indicate it's a content API route
        type: 'content-api',
      },
    };

    const isPlaygroundRequest =
      ctx.request.method === 'GET' &&
      ctx.request.url === path && // Matches the GraphQL endpoint
      strapi.plugin('graphql').service('utils').playground.isEnabled() && // Only allow if the Playground is enabled
      ctx.request.header.accept?.includes('text/html'); // Specific to Playground UI loading

    // Skip authentication for the GraphQL Playground UI
    if (isPlaygroundRequest) {
      return next();
    }

    return strapi.auth.authenticate(ctx, next);
  });

  // add the graphql server for koa
  handler.push(
    koaMiddleware<DefaultStateExtends, DefaultContextExtends>(server, {
      // Initialize loaders for this request.
      context: async ({ ctx }) => ({
        state: ctx.state,
        koaContext: ctx,
      }),
    })
  );

  // now that handlers are set up, add the graphql route to our apollo server
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

  // Register destroy behavior
  // We're doing it here instead of exposing a destroy method to the strapi-server.js
  // file since we need to have access to the ApolloServer instance
  strapi.plugin('graphql').destroy = async () => {
    await server.stop();
  };
}
