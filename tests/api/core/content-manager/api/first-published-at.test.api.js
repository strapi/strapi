'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;

const compo = {
  displayName: 'fpa-compo',
  attributes: {
    title: {
      type: 'string',
      required: true,
    },
  },
};

const tag = {
  displayName: 'fpa-tag',
  singularName: 'fpa-tag',
  pluralName: 'fpa-tags',
  kind: 'collectionType',
  draftAndPublish: true,
  attributes: {
    name: {
      type: 'string',
      required: true,
    },
  },
};

const article = {
  displayName: 'fpa-article',
  singularName: 'fpa-article',
  pluralName: 'fpa-articles',
  kind: 'collectionType',
  draftAndPublish: true,
  attributes: {
    title: {
      type: 'string',
      required: true,
    },
    dz: {
      type: 'dynamiczone',
      components: ['default.fpa-compo'],
    },
    compo: {
      type: 'component',
      component: 'default.fpa-compo',
    },
    tags: {
      type: 'relation',
      relation: 'manyToMany',
      target: 'api::fpa-tag.fpa-tag',
      targetAttribute: 'articles',
    },
  },
};

describe('CM API - first publish with experimental_firstPublishedAt', () => {
  beforeAll(async () => {
    await builder.addComponent(compo).addContentType(tag).addContentType(article).build();

    strapi = await createStrapiInstance({
      register({ strapi }) {
        strapi.config.set('features.future.experimental_firstPublishedAt', true);
      },
    });
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('dynamic zone + component', () => {
    test('first publish includes dynamic zone and component data', async () => {
      const UID = 'api::fpa-article.fpa-article';

      const body = {
        title: 'DZ test',
        dz: [{ __component: 'default.fpa-compo', title: 'dz item' }],
        compo: { title: 'single compo' },
      };

      // Create draft
      const createRes = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/${UID}`,
        body,
      });

      expect(createRes.statusCode).toBe(201);
      expect(createRes.body.data.publishedAt).toBeNull();

      const { documentId } = createRes.body.data;

      // First publish
      const publishRes = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/${UID}/${documentId}/actions/publish`,
      });

      expect(publishRes.statusCode).toBe(200);
      expect(publishRes.body.data.publishedAt).not.toBeNull();

      // Fetch the published version explicitly
      const publishedRes = await rq({
        method: 'GET',
        url: `/content-manager/collection-types/${UID}/${documentId}`,
        qs: { status: 'published' },
      });

      expect(publishedRes.statusCode).toBe(200);

      const published = publishedRes.body.data;

      // Dynamic zone must be present and populated
      expect(published.dz).toHaveLength(1);
      expect(published.dz[0]).toMatchObject({
        __component: 'default.fpa-compo',
        title: 'dz item',
      });

      // Component must be present and populated
      expect(published.compo).toMatchObject({
        title: 'single compo',
      });
    });
  });

  describe('many-to-many relations', () => {
    test('first publish includes M2M relation data', async () => {
      const TAG_UID = 'api::fpa-tag.fpa-tag';
      const ARTICLE_UID = 'api::fpa-article.fpa-article';

      // Create and publish two tags so the published article can reference them
      const tag1Res = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/${TAG_UID}`,
        body: { name: 'Tag A' },
      });
      expect(tag1Res.statusCode).toBe(201);
      const tag1DocId = tag1Res.body.data.documentId;

      await rq({
        method: 'POST',
        url: `/content-manager/collection-types/${TAG_UID}/${tag1DocId}/actions/publish`,
      });

      const tag2Res = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/${TAG_UID}`,
        body: { name: 'Tag B' },
      });
      expect(tag2Res.statusCode).toBe(201);
      const tag2DocId = tag2Res.body.data.documentId;

      await rq({
        method: 'POST',
        url: `/content-manager/collection-types/${TAG_UID}/${tag2DocId}/actions/publish`,
      });

      // Create article draft with M2M tags
      const createRes = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/${ARTICLE_UID}`,
        body: {
          title: 'M2M test',
          tags: { connect: [tag1DocId, tag2DocId] },
        },
      });

      expect(createRes.statusCode).toBe(201);
      expect(createRes.body.data.publishedAt).toBeNull();

      const { documentId } = createRes.body.data;

      // First publish
      const publishRes = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/${ARTICLE_UID}/${documentId}/actions/publish`,
      });

      expect(publishRes.statusCode).toBe(200);
      expect(publishRes.body.data.publishedAt).not.toBeNull();

      // Fetch the published version explicitly
      const publishedRes = await rq({
        method: 'GET',
        url: `/content-manager/collection-types/${ARTICLE_UID}/${documentId}`,
        qs: { status: 'published' },
      });

      expect(publishedRes.statusCode).toBe(200);

      const published = publishedRes.body.data;

      // M2M relations must be present on the published version
      expect(published.tags).toBeDefined();
      expect(published.tags.count).toBe(2);
    });
  });
});
