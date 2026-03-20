import { mergeWith, isArray, isObject } from 'lodash/fp';
import { ApolloServer, type ApolloServerPlugin, type ApolloServerOptions } from '@apollo/server-v5';
import { koaMiddleware } from '@as-integrations/koa';
import depthLimit from 'graphql-depth-limit';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';

import type { Core } from '@strapi/types';
import type { Options } from '@koa/cors';
import type { BaseContext, DefaultContextExtends, DefaultStateExtends } from 'koa';

import type {
  GraphqlTransportMountContext,
  GraphqlTransportMountResult,
  ResolvedApolloGraphqlTransport,
} from '../types';

import { createApolloV5FormatErrorHandler } from './format-error-handler-v5';
import { determineLandingPageV5 } from './landing-page-v5';

const merge = mergeWith((a: unknown, b: unknown) => {
  if (isArray(a) && isArray(b)) {
    return a.concat(b);
  }
});

type StrapiGraphQLContext = BaseContext & {
  rootQueryArgs?: Record<string, unknown>;
};

type CustomOptions = {
  cors?: boolean | Options;
  uploads: boolean;
  bodyParserConfig: boolean | Record<string, unknown>;
};

/**
 * Apollo Server v5 + Koa: same route/middleware behavior as v4; uses Apollo 5 defaults where applicable.
 */
export async function mountApolloV5(
  { strapi, schema }: GraphqlTransportMountContext,
  resolved: ResolvedApolloGraphqlTransport
): Promise<GraphqlTransportMountResult> {
  const { config } = strapi.plugin('graphql');

  const path: string = config('endpoint');

  const landingPage = determineLandingPageV5(strapi);

  const pluginAddRootQueryArgs: ApolloServerPlugin<StrapiGraphQLContext> = {
    async requestDidStart() {
      return {
        async executionDidStart() {
          return {
            willResolveField({ source, args, contextValue, info }) {
              if (!source && info.operation.operation === 'query') {
                const fieldName = info.fieldName;
                contextValue.rootQueryArgs = {
                  ...args,
                  _originField: fieldName,
                };
              }
            },
          };
        },
      };
    },
  };

  const formatError = createApolloV5FormatErrorHandler(strapi);

  const defaultServerConfig: ApolloServerOptions<StrapiGraphQLContext> & CustomOptions = {
    schema,
    validationRules: [depthLimit(config('depthLimit') as number) as any],
    formatError,
    cors: undefined,
    uploads: false,
    bodyParserConfig: true,
    status400ForVariableCoercionErrors: true,
    plugins: [landingPage, pluginAddRootQueryArgs],
    cache: 'bounded' as const,
  };

  const serverConfig = merge(
    defaultServerConfig,
    resolved.apolloOptions
  ) as ApolloServerOptions<StrapiGraphQLContext> & CustomOptions;

  const server = new ApolloServer(serverConfig);

  try {
    await server.start();
  } catch (error) {
    if (error instanceof Error) {
      strapi.log.error('Failed to start the Apollo server (v5)', error.message);
    }

    throw error;
  }

  const handler: Core.MiddlewareHandler[] = [];

  if (serverConfig.cors === false) {
    // no CORS middleware
  } else if (serverConfig.cors === undefined || serverConfig.cors === true) {
    handler.push(cors());
  } else {
    handler.push(cors(serverConfig.cors));
  }

  if (isObject(serverConfig.bodyParserConfig)) {
    handler.push(bodyParser(serverConfig.bodyParserConfig));
  } else if (serverConfig.bodyParserConfig) {
    handler.push(bodyParser());
  } else {
    strapi.log.debug('Body parser has been disabled for Apollo server');
  }

  handler.push((ctx, next) => {
    ctx.state.route = {
      info: {
        type: 'content-api',
      },
    };

    const isPlaygroundRequest =
      ctx.request.method === 'GET' &&
      ctx.request.url === path &&
      strapi.plugin('graphql').service('utils').playground.isEnabled() &&
      ctx.request.header.accept?.includes('text/html');

    if (isPlaygroundRequest) {
      return next();
    }

    return strapi.auth.authenticate(ctx, next);
  });

  // @as-integrations/koa is typed against Apollo v4; Apollo v5 is structurally compatible at runtime.
  handler.push(
    koaMiddleware<DefaultStateExtends, DefaultContextExtends>(server as any, {
      context: async ({ ctx }) => ({
        state: ctx.state,
        koaContext: ctx,
      }),
    })
  );

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

  return {
    async destroy() {
      await server.stop();
    },
  };
}
