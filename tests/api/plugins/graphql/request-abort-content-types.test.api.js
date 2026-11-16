'use strict';

const http = require('http');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');

const builder = createTestBuilder();

const articleModel = {
  attributes: { title: { type: 'text' } },
  singularName: 'article',
  pluralName: 'articles',
  displayName: 'Article',
  description: '',
  collectionName: '',
};

const labelModel = {
  attributes: {
    name: { type: 'text' },
    articles: {
      type: 'relation',
      relation: 'manyToMany',
      target: 'api::article.article',
      targetAttribute: 'labels',
    },
  },
  singularName: 'label',
  pluralName: 'labels',
  displayName: 'Label',
  description: '',
  collectionName: '',
};

const createDeferred = () => {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
};

describe('GraphQL request disconnects on generated content types', () => {
  let strapi;
  let port;
  let state;

  beforeAll(async () => {
    await builder.addContentTypes([articleModel, labelModel]).build();

    strapi = await createStrapiInstance({
      bootstrap({ strapi: instance }) {
        instance.config.set('plugin::graphql.apolloServer.plugins', [
          {
            async requestDidStart({ request }) {
              if (!request.query.includes('labels')) {
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
            resolversConfig: {
              'Query.labels': {
                middlewares: [
                  async (resolve, parent, args, context, info) => {
                    const result = await resolve(parent, args, context, info);
                    context.koaContext.res.once('close', () => {
                      state.disconnected.resolve(context.koaContext.res.writableEnded);
                    });
                    state.rootResolved.resolve();
                    await state.releaseRoot.promise;
                    return result;
                  },
                ],
              },
            },
          });
      },
    });
    port = strapi.server.httpServer.address().port;

    const article = await strapi.documents('api::article.article').create({
      data: { title: 'article' },
    });
    for (let i = 0; i < 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await strapi.documents('api::label.label').create({
        data: { name: `label ${i}`, articles: [article.documentId] },
      });
    }
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  beforeEach(() => {
    state = {
      rootResolved: createDeferred(),
      disconnected: createDeferred(),
      releaseRoot: createDeferred(),
      operationSettled: createDeferred(),
    };
  });

  const runDisconnectedQuery = async (afterRootResolved = () => {}) => {
    const request = http.request({
      method: 'POST',
      port,
      path: '/graphql',
      headers: { 'content-type': 'application/json' },
    });
    request.on('error', () => {});
    request.end(
      JSON.stringify({ query: '{ labels { documentId name articles { documentId title } } }' })
    );

    await state.rootResolved.promise;
    afterRootResolved();
    request.destroy();
    expect(await state.disconnected.promise).toBe(false);
    state.releaseRoot.resolve();
    await state.operationSettled.promise;
  };

  test('does not load relations of a generated content type after a client disconnect', async () => {
    const validateQuery = jest.spyOn(strapi.contentAPI.validate, 'query');

    try {
      // The root resolver validates its own query first, so only count calls after it is done.
      await runDisconnectedQuery(() => validateQuery.mockClear());

      // The association resolver of Label.articles validates its query before it loads anything.
      expect(validateQuery).not.toHaveBeenCalled();
    } finally {
      state.releaseRoot.resolve();
      validateQuery.mockRestore();
    }
  });

  test('does not write server errors to the log for skipped fields', async () => {
    const logError = jest.spyOn(strapi.log, 'error').mockImplementation(() => {});

    try {
      await runDisconnectedQuery();

      expect(logError).not.toHaveBeenCalled();
    } finally {
      state.releaseRoot.resolve();
      logError.mockRestore();
    }
  });
});
