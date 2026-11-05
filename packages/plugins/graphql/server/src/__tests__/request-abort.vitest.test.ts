import http from 'node:http';
import { createRequire } from 'node:module';

import Koa from 'koa';
import compose from 'koa-compose';
import type { Core } from '@strapi/types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { bootstrap } from '../bootstrap';

// Apollo is externalized by Vitest. Loading graphql through Node too keeps the
// schema in the same module realm as Apollo.
const require = createRequire(import.meta.url);
const { GraphQLObjectType, GraphQLSchema, GraphQLString } =
  require('graphql') as typeof import('graphql');

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
};

describe('GraphQL request disconnects', () => {
  const servers: http.Server[] = [];
  const destroyers: Array<() => Promise<void>> = [];

  afterEach(async () => {
    await Promise.all(destroyers.splice(0).map((destroy) => destroy()));
    await Promise.all(
      servers.splice(0).map(async (server) => {
        server.closeAllConnections?.();
        await new Promise<void>((resolve) => {
          server.close(() => {
            resolve();
          });
        });
      })
    );
  });

  it.each([
    ['generated schema', false],
    ['apolloServer.schema override', true],
  ])(
    'does not resolve remaining fields after the HTTP client disconnects using %s',
    async (_schemaSource, overrideSchema) => {
      const rootResolved = createDeferred<void>();
      const continueRoot = createDeferred<void>();
      const serverObservedDisconnect = createDeferred<boolean>();
      const mutationStarted = createDeferred<void>();
      const continueMutation = createDeferred<void>();
      const mutationDisconnected = createDeferred<boolean>();
      const childResolver = vi.fn(() => 'completed after disconnect');
      const liveChildResolver = vi.fn(() => 'still-live');
      const laterMutationResolver = vi.fn(() => 'completed after disconnect');
      const routes = vi.fn();
      const fieldErrors: Array<{ field: string; error?: string }> = [];
      // Resolved once Apollo has finished the disconnected operation, not when the Koa handler
      // returns: the handler can settle before the operation's remaining fields run.
      let resolveOperationSettled: () => void = () => {};
      const tracingPlugin = {
        async requestDidStart({ request }: { request: { query?: string } }) {
          return {
            async willSendResponse() {
              if (request.query?.includes('slow')) {
                resolveOperationSettled();
              }
            },
            async executionDidStart() {
              return {
                willResolveField({
                  info,
                }: {
                  info: { parentType: { name: string }; fieldName: string };
                }) {
                  const field = `${info.parentType.name}.${info.fieldName}`;

                  return (error: unknown) => {
                    fieldErrors.push({ field, error: (error as Error | null)?.message });
                  };
                },
              };
            },
          };
        },
      };

      const customSchema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            live: {
              type: new GraphQLObjectType({
                name: 'LiveResult',
                fields: {
                  value: {
                    type: GraphQLString,
                    resolve: liveChildResolver,
                  },
                },
              }),
              resolve() {
                return {};
              },
            },
            slow: {
              type: new GraphQLObjectType({
                name: 'SlowResult',
                fields: {
                  value: {
                    type: GraphQLString,
                    resolve: childResolver,
                  },
                },
              }),
              async resolve(_source, _args, context) {
                context.koaContext.res.once('close', () => {
                  serverObservedDisconnect.resolve(context.koaContext.res.writableEnded);
                });
                rootResolved.resolve();
                await continueRoot.promise;
                return {};
              },
            },
          },
        }),
        mutation: new GraphQLObjectType({
          name: 'Mutation',
          fields: {
            slowMutation: {
              type: GraphQLString,
              async resolve(_source, _args, context) {
                context.koaContext.res.once('close', () => {
                  mutationDisconnected.resolve(context.koaContext.res.writableEnded);
                });
                mutationStarted.resolve();
                await continueMutation.promise;
                return 'first mutation result';
              },
            },
            laterMutation: {
              type: GraphQLString,
              resolve: laterMutationResolver,
            },
          },
        }),
      });
      const generatedSchema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'GeneratedQuery',
          fields: {
            generated: { type: GraphQLString },
          },
        }),
      });

      const plugin: {
        config: (key: string) => unknown;
        service: (name: string) => unknown;
        destroy?: () => Promise<void>;
      } = {
        config(key: string) {
          return {
            endpoint: '/graphql',
            depthLimit: 10,
            maxLimit: 100,
            landingPage: false,
            apolloServer: {
              bodyParserConfig: true,
              plugins: [tracingPlugin],
              ...(overrideSchema ? { schema: customSchema } : {}),
            },
          }[key];
        },
        service(name: string) {
          if (name === 'content-api') {
            return { buildSchema: () => (overrideSchema ? generatedSchema : customSchema) };
          }

          return { playground: { setEnabled: vi.fn(), isEnabled: () => false } };
        },
      };
      const strapi = {
        plugin: () => plugin,
        log: { warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
        server: { routes },
        auth: { authenticate: (_ctx: Koa.Context, next: Koa.Next) => next() },
      };

      await bootstrap({ strapi: strapi as unknown as Core.Strapi });
      destroyers.push(async () => plugin.destroy?.());

      const [{ handler }] = routes.mock.calls[0][0];
      const app = new Koa();
      app.use(compose(handler));
      const server = app.listen();
      servers.push(server);
      await new Promise<void>((resolve) => {
        server.once('listening', resolve);
      });
      const { port } = server.address() as { port: number };

      const clientRequest = http.request({
        method: 'POST',
        port,
        path: '/graphql',
        headers: { 'content-type': 'application/json' },
      });
      clientRequest.on('error', () => {});
      const operationSettled = createDeferred<void>();
      resolveOperationSettled = operationSettled.resolve;
      clientRequest.end(JSON.stringify({ query: '{ slow { value } }' }));

      try {
        await rootResolved.promise;
        clientRequest.destroy();
        expect(await serverObservedDisconnect.promise).toBe(false);

        const liveResponse = await fetch(`http://localhost:${port}/graphql`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ query: '{ live { value } }' }),
        });
        expect(await liveResponse.json()).toEqual({ data: { live: { value: 'still-live' } } });
        expect(liveChildResolver).toHaveBeenCalledOnce();

        continueRoot.resolve();

        await operationSettled.promise;
        expect(childResolver).not.toHaveBeenCalled();
        // Plugins still see the skipped field and receive the abort error.
        expect(fieldErrors).toContainEqual({
          field: 'SlowResult.value',
          error: 'GraphQL request was aborted because the client disconnected',
        });

        const mutationRequest = http.request({
          method: 'POST',
          port,
          path: '/graphql',
          headers: { 'content-type': 'application/json' },
        });
        mutationRequest.on('error', () => {});
        const mutationSettled = createDeferred<void>();
        resolveOperationSettled = mutationSettled.resolve;
        mutationRequest.end(JSON.stringify({ query: 'mutation { slowMutation laterMutation }' }));

        await mutationStarted.promise;
        mutationRequest.destroy();
        expect(await mutationDisconnected.promise).toBe(false);
        continueMutation.resolve();

        await mutationSettled.promise;
        expect(laterMutationResolver).not.toHaveBeenCalled();
        expect(fieldErrors).toContainEqual({
          field: 'Mutation.laterMutation',
          error: 'GraphQL request was aborted because the client disconnected',
        });
      } finally {
        continueRoot.resolve();
        continueMutation.resolve();
      }
    }
  );
});
