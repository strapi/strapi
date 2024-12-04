/**
 * Patched version of @as-integrations/koa.
 */
import { Readable } from 'node:stream';
import { parse } from 'node:url';
import type { WithRequired } from '@apollo/utils.withrequired';
import {
  type ApolloServer,
  type BaseContext,
  type ContextFunction,
  type HTTPGraphQLRequest,
  HeaderMap,
} from '@apollo/server';
import type Koa from 'koa';

export interface KoaContextFunctionArgument<
  StateT = Koa.DefaultState,
  ContextT = Koa.DefaultContext,
> {
  ctx: Koa.ParameterizedContext<StateT, ContextT>;
}

interface KoaMiddlewareOptions<TContext extends BaseContext, StateT, ContextT> {
  context?: ContextFunction<[KoaContextFunctionArgument<StateT, ContextT>], TContext>;
}

export function koaMiddleware<StateT = Koa.DefaultState, ContextT = Koa.DefaultContext>(
  server: ApolloServer<BaseContext>,
  options?: KoaMiddlewareOptions<BaseContext, StateT, ContextT>
): Koa.Middleware<StateT, ContextT>;
export function koaMiddleware<
  TContext extends BaseContext,
  StateT = Koa.DefaultState,
  ContextT = Koa.DefaultContext,
>(
  server: ApolloServer<TContext>,
  options: WithRequired<KoaMiddlewareOptions<TContext, StateT, ContextT>, 'context'>
): Koa.Middleware<StateT, ContextT>;
export function koaMiddleware<
  TContext extends BaseContext,
  StateT = Koa.DefaultState,
  ContextT = Koa.DefaultContext,
>(
  server: ApolloServer<TContext>,
  options?: KoaMiddlewareOptions<TContext, StateT, ContextT>
): Koa.Middleware<StateT, ContextT> {
  server.assertStarted('koaMiddleware()');

  // This `any` is safe because the overload above shows that context can
  // only be left out if you're using BaseContext as your context, and {} is a
  // valid BaseContext.
  const defaultContext: ContextFunction<
    [KoaContextFunctionArgument<StateT, ContextT>],
    any
  > = async () => ({});

  const context: ContextFunction<[KoaContextFunctionArgument<StateT, ContextT>], TContext> =
    options?.context ?? defaultContext;

  return async (ctx, next) => {
    if (!ctx.request.body) {
      // The json koa-bodyparser *always* sets ctx.request.body to {} if it's unset (even
      // if the Content-Type doesn't match), so if it isn't set, you probably
      // forgot to set up koa-bodyparser.
      ctx.status = 500;
      ctx.body =
        '`ctx.request.body` is not set; this probably means you forgot to set up the ' +
        '`koa-bodyparser` middleware before the Apollo Server middleware.';
      return;
    }

    const incomingHeaders = new HeaderMap();
    for (const [key, value] of Object.entries(ctx.headers)) {
      if (value !== undefined) {
        // Node/Koa headers can be an array or a single value. We join
        // multi-valued headers with `, ` just like the Fetch API's `Headers`
        // does. We assume that keys are already lower-cased (as per the Node
        // docs on IncomingMessage.headers) and so we don't bother to lower-case
        // them or combine across multiple keys that would lower-case to the
        // same value.
        incomingHeaders.set(key, Array.isArray(value) ? value.join(', ') : value);
      }
    }

    const httpGraphQLRequest: HTTPGraphQLRequest = {
      method: ctx.method.toUpperCase(),
      headers: incomingHeaders,
      search: parse(ctx.url).search ?? '',
      body: ctx.request.body,
    };

    const { body, headers, status } = await server.executeHTTPGraphQLRequest({
      httpGraphQLRequest,
      context: () => context({ ctx }),
    });

    if (body.kind === 'complete') {
      ctx.body = body.string;
    } else if (body.kind === 'chunked') {
      ctx.body = Readable.from(
        (async function* () {
          for await (const chunk of body.asyncIterator) {
            yield chunk;
            if (typeof ctx.body.flush === 'function') {
              // If this response has been piped to a writable compression stream then `flush` after
              // each chunk.
              // This is identical to the Express integration:
              // https://github.com/apollographql/apollo-server/blob/a69580565dadad69de701da84092e89d0fddfa00/packages/server/src/express4/index.ts#L96-L105
              ctx.body.flush();
            }
          }
        })()
      );
    } else {
      throw Error(`Delivery method ${(body as any).kind} not implemented`);
    }

    if (status !== undefined) {
      ctx.status = status;
    }
    for (const [key, value] of headers) {
      ctx.set(key, value);
    }

    return next();
  };
}
