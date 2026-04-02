'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest, createContentAPIRequest } = require('api-tests/request');

const builder = createTestBuilder();

const articleModel = {
  attributes: {
    title: { type: 'string' },
  },
  draftAndPublish: true,
  singularName: 'article',
  pluralName: 'articles',
  displayName: 'Article',
  description: '',
  collectionName: '',
};

const fixtures = [
  { title: 'Draft only', documentId: 'doc-1', publishedAt: null },
  { title: 'Also published', documentId: 'doc-2', publishedAt: null },
  { title: 'Also published', documentId: 'doc-2', publishedAt: new Date() },
];

const ARTICLE_ACTIONS = {
  find: 'api::article.article.find',
  findOne: 'api::article.article.findOne',
  readDraft: 'api::article.article.readDraft',
};

describe('Content API readDraft (API tokens)', () => {
  let strapi;
  let adminRq;
  let tokenCounter = 0;

  const deleteAllTokens = async () => {
    const tokens = await strapi.service('admin::api-token').list();
    await Promise.all(tokens.map(({ id }) => strapi.service('admin::api-token').revoke(id)));
  };

  beforeAll(async () => {
    await builder
      .addContentType(articleModel)
      .addFixtures(articleModel.singularName, fixtures)
      .build();

    strapi = await createStrapiInstance({ bypassAuth: false });
    strapi.config.set(
      'admin.secrets.encryptionKey',
      'test-encryption-key-for-api-tokens-read-draft'
    );
    adminRq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await deleteAllTokens();
    await strapi.destroy();
    await builder.cleanup();
  });

  afterEach(async () => {
    await deleteAllTokens();
  });

  const createCustomToken = async (permissions) => {
    tokenCounter += 1;
    const res = await adminRq({
      url: '/admin/api-tokens',
      method: 'POST',
      body: {
        name: `read-draft-token-${tokenCounter}`,
        description: 'api-token read-draft content API tests',
        type: 'custom',
        permissions,
      },
    });
    expect(res.status).toBe(201);
    return res.body.data.accessKey;
  };

  const createReadOnlyToken = async () => {
    tokenCounter += 1;
    const res = await adminRq({
      url: '/admin/api-tokens',
      method: 'POST',
      body: {
        name: `read-only-token-${tokenCounter}`,
        description: 'api-token read-draft content API tests',
        type: 'read-only',
      },
    });
    expect(res.status).toBe(201);
    return res.body.data.accessKey;
  };

  const createFullAccessToken = async () => {
    tokenCounter += 1;
    const res = await adminRq({
      url: '/admin/api-tokens',
      method: 'POST',
      body: {
        name: `full-access-token-${tokenCounter}`,
        description: 'api-token read-draft content API tests',
        type: 'full-access',
      },
    });
    expect(res.status).toBe(201);
    return res.body.data.accessKey;
  };

  describe('GET /admin/content-api/permissions', () => {
    test('includes readDraft for draft & publish content types', async () => {
      const res = await adminRq({
        url: '/admin/content-api/permissions',
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const controllers = res.body.data['api::article']?.controllers;
      expect(controllers?.article).toEqual(
        expect.arrayContaining(['find', 'findOne', 'readDraft'])
      );
    });
  });

  describe('custom API token (CASL ability)', () => {
    test('with find + findOne but without readDraft: default list returns 403', async () => {
      const accessKey = await createCustomToken([ARTICLE_ACTIONS.find, ARTICLE_ACTIONS.findOne]);
      const rq = createContentAPIRequest({ strapi, auth: { token: accessKey } });

      const res = await rq.get('/articles');
      expect(res.status).toBe(403);
    });

    test('with find + findOne but without readDraft: published-only list returns 200', async () => {
      const accessKey = await createCustomToken([ARTICLE_ACTIONS.find, ARTICLE_ACTIONS.findOne]);
      const rq = createContentAPIRequest({ strapi, auth: { token: accessKey } });

      const res = await rq.get('/articles?status=published');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('with find + findOne + readDraft: default list returns 200', async () => {
      const accessKey = await createCustomToken([
        ARTICLE_ACTIONS.find,
        ARTICLE_ACTIONS.findOne,
        ARTICLE_ACTIONS.readDraft,
      ]);
      const rq = createContentAPIRequest({ strapi, auth: { token: accessKey } });

      const res = await rq.get('/articles');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('read-only API token (no CASL ability)', () => {
    test('default list returns 200 (read-draft check is not applied)', async () => {
      const accessKey = await createReadOnlyToken();
      const rq = createContentAPIRequest({ strapi, auth: { token: accessKey } });

      const res = await rq.get('/articles');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('full-access API token (no CASL ability)', () => {
    test('default list returns 200 (read-draft check is not applied)', async () => {
      const accessKey = await createFullAccessToken();
      const rq = createContentAPIRequest({ strapi, auth: { token: accessKey } });

      const res = await rq.get('/articles');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
