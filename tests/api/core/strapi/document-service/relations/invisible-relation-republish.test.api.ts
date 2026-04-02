/**
 * visible: false relations must survive documents().update(..., status: 'published').
 * Internal publish load must populate invisible relations so the new published row re-attaches links.
 */
import fs from 'node:fs';
import path from 'node:path';

import type { Core, UID } from '@strapi/types';
import { testInTransaction } from '../../../../utils';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');

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
  pluralName: 'Legacies',
  description: '',
  collectionName: '',
};

/** CTB adds `legacy` on article when legacy is created; CMS-150 uses visible: false on that inverse field. */
const setArticleLegacyInvisible = () => {
  const schemaPath = path.join(
    process.cwd(),
    'test-apps/api/src/api/article/content-types/article/schema.json'
  );
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  if (!schema.attributes?.legacy) {
    throw new Error(`Expected legacy attribute in ${schemaPath}`);
  }

  schema.attributes.legacy.visible = false;
  fs.writeFileSync(schemaPath, `${JSON.stringify(schema, null, 2)}\n`, 'utf8');
};

describe('Document Service invisible inverse oneToOne (CMS-150)', () => {
  beforeAll(async () => {
    await builder.addContentTypes([articleBaseModel, legacyModel]).build();
    setArticleLegacyInvisible();
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
