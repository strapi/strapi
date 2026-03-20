import { mergeWith, isArray, isObject } from 'lodash/fp';
import { ApolloServer, type ApolloServerPlugin, type ApolloServerOptions } from '@apollo/server';
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

import { createApolloV4FormatErrorHandler } from './format-error-handler-v4';
import { determineLandingPageV4 } from './landing-page-v4';

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
 * Apollo Server v4 + Koa: same behavior as the historical graphql plugin bootstrap.
 */
export async function mountApolloV4(
  { strapi, schema }: GraphqlTransportMountContext,
  resolved: ResolvedApolloGraphqlTransport
): Promise<GraphqlTransportMountResult> {
  const { config } = strapi.plugin('graphql');

  const path: string = config('endpoint');

  const landingPage = determineLandingPageV4(strapi);

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

  const formatError = createApolloV4FormatErrorHandler(strapi);

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
      strapi.log.error('Failed to start the Apollo server', error.message);
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

  handler.push(
    koaMiddleware<DefaultStateExtends, DefaultContextExtends>(server, {
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
