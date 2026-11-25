'use strict';

const http = require('http');

const { createStrapiInstance } = require('api-tests/strapi');

const createDeferred = () => {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
};

const requestGraphQL = ({ port, query }) =>
  new Promise((resolve, reject) => {
    const request = http.request(
      {
        method: 'POST',
        port,
        path: '/graphql',
        headers: { 'content-type': 'application/json' },
      },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          try {
            resolve({ statusCode: response.statusCode, body: JSON.parse(body) });
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    request.on('error', reject);
    request.end(JSON.stringify({ query }));
  });

describe('GraphQL request disconnects', () => {
  let strapi;
  let port;
  let state;

  beforeAll(async () => {
    strapi = await createStrapiInstance({
      bootstrap({ strapi: instance }) {
        instance.config.set('plugin::graphql.apolloServer.plugins', [
          {
            async requestDidStart({ request }) {
              if (!request.query.includes('slow')) {
                return undefined;
              }

              return {
                async willSendResponse() {
                  state.operationSettled.resolve();
                },
              };
            },
          },
        ]);
        instance
          .plugin('graphql')
          .service('extension')
          .use({
            typeDefs: /* GraphQL */ `
              type AbortResult {
                value: String
              }

              type Query {
                slow: AbortResult
                live: AbortResult
              }

              type Mutation {
                slowMutation: String
                laterMutation: String
              }
            `,
            resolvers: {
              Query: {
                async slow(_parent, _args, context) {
                  context.koaContext.res.once('close', () => {
                    state.queryDisconnected.resolve(context.koaContext.res.writableEnded);
                  });
                  state.queryStarted.resolve();
                  await state.releaseQuery.promise;
                  return {};
                },
                live() {
                  return {};
                },
              },
              AbortResult: {
                value() {
                  state.nestedFieldCalls += 1;
                  return 'completed';
                },
              },
              Mutation: {
                async slowMutation(_parent, _args, context) {
                  context.koaContext.res.once('close', () => {
                    state.mutationDisconnected.resolve(context.koaContext.res.writableEnded);
                  });
                  state.mutationStarted.resolve();
                  await state.releaseMutation.promise;
                  return 'first mutation result';
                },
                laterMutation() {
                  state.laterMutationCalls += 1;
                  return 'completed after disconnect';
                },
              },
            },
          });
      },
    });
    port = strapi.server.httpServer.address().port;
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  beforeEach(() => {
    state = {
      queryStarted: createDeferred(),
      queryDisconnected: createDeferred(),
      releaseQuery: createDeferred(),
      mutationStarted: createDeferred(),
      mutationDisconnected: createDeferred(),
      releaseMutation: createDeferred(),
      operationSettled: createDeferred(),
      nestedFieldCalls: 0,
      laterMutationCalls: 0,
    };
  });

  test('stops future query fields after a client disconnect without affecting live requests', async () => {
    try {
      const disconnectedQuery = http.request({
        method: 'POST',
        port,
        path: '/graphql',
        headers: { 'content-type': 'application/json' },
      });
      disconnectedQuery.on('error', () => {});
      disconnectedQuery.end(JSON.stringify({ query: '{ slow { value } }' }));

      await state.queryStarted.promise;
      disconnectedQuery.destroy();
      expect(await state.queryDisconnected.promise).toBe(false);

      const liveResponse = await requestGraphQL({ port, query: '{ live { value } }' });
      expect(liveResponse).toEqual({
        statusCode: 200,
        body: { data: { live: { value: 'completed' } } },
      });

      state.releaseQuery.resolve();
      await state.operationSettled.promise;
      expect(state.nestedFieldCalls).toBe(1);
    } finally {
      state.releaseQuery.resolve();
    }
  });

  test('stops later serial mutation fields after a client disconnect', async () => {
    try {
      const disconnectedMutation = http.request({
        method: 'POST',
        port,
        path: '/graphql',
        headers: { 'content-type': 'application/json' },
      });
      disconnectedMutation.on('error', () => {});
      disconnectedMutation.end(
        JSON.stringify({ query: 'mutation { slowMutation laterMutation }' })
      );

      await state.mutationStarted.promise;
      disconnectedMutation.destroy();
      expect(await state.mutationDisconnected.promise).toBe(false);

      state.releaseMutation.resolve();
      await state.operationSettled.promise;
      expect(state.laterMutationCalls).toBe(0);
    } finally {
      state.releaseMutation.resolve();
    }
  });
});
