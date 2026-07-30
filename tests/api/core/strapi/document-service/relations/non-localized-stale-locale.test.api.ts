/**
 * Relation id resolution for non-localized content types when database rows still
 * carry a stale locale column value (e.g. after i18n was disabled on the type).
 */
import type { Core, UID } from '@strapi/types';
import { testInTransaction } from '../../../../utils';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');

let strapi: Core.Strapi;
const builder = createTestBuilder();

const FEATURE_UID = 'api::feature.feature' as UID.ContentType;
const FEATURE_CATEGORY_UID = 'api::feature-category.feature-category' as UID.ContentType;

const featureModel = {
  attributes: {
    title: {
      type: 'string',
    },
  },
  draftAndPublish: true,
  displayName: 'Feature',
  singularName: 'feature',
  pluralName: 'features',
  description: '',
  collectionName: '',
};

const featureCategoryModel = {
  attributes: {
    title: {
      type: 'string',
    },
    features: {
      type: 'relation',
      relation: 'oneToMany',
      target: FEATURE_UID,
      targetAttribute: 'feature_category',
    },
  },
  draftAndPublish: true,
  displayName: 'Feature category',
  singularName: 'feature-category',
  pluralName: 'feature-categories',
  description: '',
  collectionName: '',
};

describe('Document Service - non-localized relation locale resolution', () => {
  beforeAll(async () => {
    await builder.addContentTypes([featureModel, featureCategoryModel]).build();
    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  testInTransaction(
    'publishes mappedBy oneToMany when related rows have a stale locale column',
    async () => {
      const feature = await strapi.documents(FEATURE_UID).create({
        data: { title: 'Stale locale feature' },
      });

      await strapi.db.query(FEATURE_UID).updateMany({
        where: { documentId: feature.documentId },
        data: { locale: 'en' },
      });

      const category = await strapi.documents(FEATURE_CATEGORY_UID).create({
        data: { title: 'Category' },
      });

      await strapi.documents(FEATURE_CATEGORY_UID).update({
        documentId: category.documentId,
        data: {
          features: { connect: [{ documentId: feature.documentId }] },
        },
      });

      const draftFeature = await strapi.documents(FEATURE_UID).findFirst({
        documentId: feature.documentId,
        status: 'draft',
        populate: { feature_category: true },
      });

      expect(draftFeature?.feature_category?.documentId).toBe(category.documentId);

      const { entries } = await strapi.documents(FEATURE_CATEGORY_UID).publish({
        documentId: category.documentId,
      });

      expect(entries).toHaveLength(1);
      expect(entries[0].publishedAt).toBeTruthy();
    }
  );
});
