/**
 * visible: false relations must survive documents().update(..., status: 'published').
 * Internal publish load must populate invisible relations so the new published row re-attaches links.
 */
import type { Core, UID } from '@strapi/types';
import { testInTransaction } from '../../../../utils';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { getContentTypeSchema, modifyContentType } = require('api-tests/models');

let strapi: Core.Strapi;
const builder = createTestBuilder();

const ARTICLE_UID = 'api::article.article' as UID.ContentType;
const LEGACY_UID = 'api::legacy.legacy' as UID.ContentType;

const articleBaseModel = {
  attributes: {
    title: {
      type: 'string',
    },
  },
  draftAndPublish: true,
  displayName: 'Article',
  singularName: 'article',
  pluralName: 'articles',
  description: '',
  collectionName: '',
};

const legacyModel = {
  attributes: {
    code: {
      type: 'string',
    },
    article: {
      type: 'relation',
      relation: 'oneToOne',
      target: ARTICLE_UID,
      targetAttribute: 'legacy',
    },
  },
  draftAndPublish: false,
  displayName: 'Legacy',
  singularName: 'legacy',
  pluralName: 'legacies',
  description: '',
  collectionName: '',
};

describe('Document Service invisible inverse oneToOne', () => {
  beforeAll(async () => {
    await builder.addContentTypes([articleBaseModel, legacyModel]).build();

    // Set `visible: false` on the inverse relation via the content-type-builder service
    const articleSchema = await getContentTypeSchema('article');
    if (!articleSchema?.attributes?.legacy) {
      throw new Error('Expected legacy attribute on article after setup');
    }
    articleSchema.attributes.legacy.visible = false;
    await modifyContentType(articleSchema);

    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  testInTransaction(
    'published update keeps invisible mappedBy oneToOne when payload omits that relation',
    async () => {
      const article = await strapi.documents(ARTICLE_UID).create({
        data: { title: 'cms150-title' },
        status: 'published',
      });

      const legacy = await strapi.documents(LEGACY_UID).create({
        data: {
          code: 'cms150-code',
          article: article.documentId,
        },
      });

      let published = await strapi.documents(ARTICLE_UID).findFirst({
        filters: { documentId: article.documentId },
        status: 'published',
        populate: { legacy: true },
      });

      expect(published?.legacy?.documentId).toBe(legacy.documentId);

      await strapi.documents(ARTICLE_UID).update({
        documentId: article.documentId,
        data: { title: 'cms150-title-updated' },
        status: 'published',
      });

      published = await strapi.documents(ARTICLE_UID).findFirst({
        filters: { documentId: article.documentId },
        status: 'published',
        populate: { legacy: true },
      });

      expect(published?.title).toBe('cms150-title-updated');
      expect(published?.legacy?.documentId).toBe(legacy.documentId);
    }
  );
});
