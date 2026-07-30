'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const ARTICLE_UID = 'api::article.article';
const CM_URL = `/content-manager/collection-types/${ARTICLE_UID}`;
const SPACE_HEADER = 'X-Strapi-Space-Id';

const articleModel = {
  pluginOptions: {
    spaces: {
      scope: 'space',
    },
  },
  attributes: {
    title: {
      type: 'string',
    },
  },
  displayName: 'Article',
  singularName: 'article',
  pluralName: 'articles',
  description: '',
  collectionName: '',
};

describe('Spaces — space isolation', () => {
  const builder = createTestBuilder();
  let strapi;
  let rq;

  const data = {
    defaultArticle: null,
  };

  beforeAll(async () => {
    await builder.addContentType(articleModel).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    await strapi.db.query(ARTICLE_UID).deleteMany();
  });

  afterAll(async () => {
    await strapi.db.query(ARTICLE_UID).deleteMany();
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Bootstrap', () => {
    test('Seeds the default and acme spaces', async () => {
      const res = await rq({ url: '/spaces/mine', method: 'GET' });

      expect(res.statusCode).toBe(200);
      const slugs = res.body.map((space) => space.slug).sort();
      expect(slugs).toEqual(expect.arrayContaining(['acme', 'default']));
    });

    test('Rejects an unknown space header', async () => {
      const res = await rq({
        url: CM_URL,
        method: 'GET',
        headers: { [SPACE_HEADER]: 'does-not-exist' },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('Write stamping & read filtering', () => {
    test('An entry created in the default space is stamped with it', async () => {
      const res = await rq({
        url: CM_URL,
        method: 'POST',
        body: { title: 'Hello from default' },
        headers: { [SPACE_HEADER]: 'default' },
      });

      expect(res.statusCode).toBe(200);
      data.defaultArticle = res.body.data ?? res.body;
      expect(data.defaultArticle.documentId).toEqual(expect.any(String));

      const row = await strapi.db.query(ARTICLE_UID).findOne({
        where: { documentId: data.defaultArticle.documentId },
        populate: { space: true },
      });
      expect(row.space).toMatchObject({ slug: 'default' });
    });

    test('The entry is visible from the default space', async () => {
      const res = await rq({
        url: CM_URL,
        method: 'GET',
        headers: { [SPACE_HEADER]: 'default' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0].title).toBe('Hello from default');
    });

    test('The entry is invisible from the acme space', async () => {
      const res = await rq({
        url: CM_URL,
        method: 'GET',
        headers: { [SPACE_HEADER]: 'acme' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.results).toHaveLength(0);
    });

    test('A user-supplied space filter cannot leak another tenant', async () => {
      const res = await rq({
        url: `${CM_URL}?filters[space][slug][$eq]=default`,
        method: 'GET',
        headers: { [SPACE_HEADER]: 'acme' },
      });

      // Either the filter is stripped/overridden (200 + empty) or rejected —
      // both are acceptable; leaking the default-space row is not.
      if (res.statusCode === 200) {
        expect(res.body.results).toHaveLength(0);
      } else {
        expect(res.statusCode).toBe(400);
      }
    });
  });

  describe('Move between spaces', () => {
    test('POST /spaces/move moves the entry to acme', async () => {
      const res = await rq({
        url: '/spaces/move',
        method: 'POST',
        body: {
          uid: ARTICLE_UID,
          documentIds: [data.defaultArticle.documentId],
          targetSpaceSlug: 'acme',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.movedCount).toBeGreaterThanOrEqual(1);
      expect(res.body.documentIds).toEqual([data.defaultArticle.documentId]);
    });

    test('After the move the entry lives in acme only', async () => {
      const fromDefault = await rq({
        url: CM_URL,
        method: 'GET',
        headers: { [SPACE_HEADER]: 'default' },
      });
      const fromAcme = await rq({
        url: CM_URL,
        method: 'GET',
        headers: { [SPACE_HEADER]: 'acme' },
      });

      expect(fromDefault.body.results).toHaveLength(0);
      expect(fromAcme.body.results).toHaveLength(1);
      expect(fromAcme.body.results[0].title).toBe('Hello from default');
    });

    test('Moving to an unknown space is a 404', async () => {
      const res = await rq({
        url: '/spaces/move',
        method: 'POST',
        body: {
          uid: ARTICLE_UID,
          documentIds: [data.defaultArticle.documentId],
          targetSpaceSlug: 'does-not-exist',
        },
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
