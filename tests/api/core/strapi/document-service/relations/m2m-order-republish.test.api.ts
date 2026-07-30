/**
 * M2M relation order must be preserved on the published version after reordering
 * relations in the draft and re-publishing the owning entry.
 */
import type { Core, UID } from '@strapi/types';

import { testInTransaction } from '../../../../utils';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');

let strapi: Core.Strapi;
const builder = createTestBuilder();

const ARTICLE_UID = 'api::article.article' as UID.ContentType;
const CATEGORY_UID = 'api::category.category' as UID.ContentType;

const categoryModel = {
  attributes: {
    name: { type: 'string' },
  },
  draftAndPublish: true,
  displayName: 'Category',
  singularName: 'category',
  pluralName: 'categories',
  description: '',
  collectionName: '',
};

const articleModel = {
  attributes: {
    title: { type: 'string' },
    categories: {
      type: 'relation',
      relation: 'manyToMany',
      target: CATEGORY_UID,
      targetAttribute: 'articles',
    },
  },
  draftAndPublish: true,
  displayName: 'Article',
  singularName: 'article',
  pluralName: 'articles',
  description: '',
  collectionName: '',
};

const publishCategory = async (name: string) => {
  const category = await strapi.documents(CATEGORY_UID).create({ data: { name } });
  await strapi.documents(CATEGORY_UID).publish({ documentId: category.documentId });
  return category.documentId;
};

const getPublishedCategoryNames = async (documentId: string) => {
  const published = await strapi.documents(ARTICLE_UID).findOne({
    documentId,
    status: 'published',
    populate: { categories: true },
  });
  return (published as any).categories.map((c: any) => c.name);
};

const getDraftCategoryNames = async (documentId: string) => {
  const draft = await strapi.documents(ARTICLE_UID).findOne({
    documentId,
    status: 'draft',
    populate: { categories: true },
  });
  return (draft as any).categories.map((c: any) => c.name);
};

const getPublishedArticleTitlesOnCategory = async (categoryDocumentId: string) => {
  const category = await strapi.documents(CATEGORY_UID).findOne({
    documentId: categoryDocumentId,
    status: 'published',
    populate: { articles: true },
  });
  return ((category as any).articles ?? []).map((a: any) => a.title);
};

describe('M2M relation order preserved on re-publish after reorder', () => {
  beforeAll(async () => {
    await builder.addContentTypes([categoryModel, articleModel]).build();
    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  testInTransaction(
    'full-array update: reorder draft then publish -> published matches draft',
    async () => {
      const categoryIds = {
        Alpha: await publishCategory('Alpha'),
        Beta: await publishCategory('Beta'),
        Gamma: await publishCategory('Gamma'),
      };

      const article = await strapi.documents(ARTICLE_UID).create({
        data: {
          title: 'Full-array order test',
          categories: [categoryIds.Beta, categoryIds.Alpha, categoryIds.Gamma],
        },
      });

      await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });

      expect(await getDraftCategoryNames(article.documentId)).toEqual(['Beta', 'Alpha', 'Gamma']);
      expect(await getPublishedCategoryNames(article.documentId)).toEqual([
        'Beta',
        'Alpha',
        'Gamma',
      ]);

      await strapi.documents(ARTICLE_UID).update({
        documentId: article.documentId,
        data: {
          categories: [categoryIds.Alpha, categoryIds.Gamma, categoryIds.Beta],
        },
      });

      expect(await getDraftCategoryNames(article.documentId)).toEqual(['Alpha', 'Gamma', 'Beta']);

      await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });

      expect(await getPublishedCategoryNames(article.documentId)).toEqual([
        'Alpha',
        'Gamma',
        'Beta',
      ]);
      expect(await getDraftCategoryNames(article.documentId)).toEqual(['Alpha', 'Gamma', 'Beta']);
    }
  );

  testInTransaction(
    'connect + position: reorder draft then publish -> published matches draft',
    async () => {
      const categoryIds = {
        Alpha: await publishCategory('Alpha'),
        Beta: await publishCategory('Beta'),
        Gamma: await publishCategory('Gamma'),
      };

      const article = await strapi.documents(ARTICLE_UID).create({
        data: {
          title: 'Connect position order test',
          categories: [categoryIds.Beta, categoryIds.Alpha, categoryIds.Gamma],
        },
      });
      await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });

      await strapi.documents(ARTICLE_UID).update({
        documentId: article.documentId,
        data: {
          categories: {
            connect: [
              { documentId: categoryIds.Alpha, position: { start: true } },
              { documentId: categoryIds.Gamma, position: { after: categoryIds.Alpha } },
              { documentId: categoryIds.Beta, position: { end: true } },
            ],
          },
        },
      });

      expect(await getDraftCategoryNames(article.documentId)).toEqual(['Alpha', 'Gamma', 'Beta']);

      await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });

      expect(await getPublishedCategoryNames(article.documentId)).toEqual([
        'Alpha',
        'Gamma',
        'Beta',
      ]);
      expect(await getDraftCategoryNames(article.documentId)).toEqual(['Alpha', 'Gamma', 'Beta']);
    }
  );

  testInTransaction(
    'connect + position single-item drag then publish -> published matches draft',
    async () => {
      const categoryIds = {
        Alpha: await publishCategory('Alpha'),
        Beta: await publishCategory('Beta'),
        Gamma: await publishCategory('Gamma'),
      };

      const article = await strapi.documents(ARTICLE_UID).create({
        data: {
          title: 'Single drag order test',
          categories: [categoryIds.Beta, categoryIds.Alpha, categoryIds.Gamma],
        },
      });
      await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });

      // Drag Beta to the end (Alpha -> Gamma -> Beta)
      await strapi.documents(ARTICLE_UID).update({
        documentId: article.documentId,
        data: {
          categories: {
            connect: [{ documentId: categoryIds.Beta, position: { end: true } }],
          },
        },
      });

      expect(await getDraftCategoryNames(article.documentId)).toEqual(['Alpha', 'Gamma', 'Beta']);

      await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });

      expect(await getPublishedCategoryNames(article.documentId)).toEqual([
        'Alpha',
        'Gamma',
        'Beta',
      ]);
    }
  );

  testInTransaction(
    'multiple reorder/publish cycles keep published in sync with draft',
    async () => {
      const categoryIds = {
        Alpha: await publishCategory('Alpha'),
        Beta: await publishCategory('Beta'),
        Gamma: await publishCategory('Gamma'),
      };

      const article = await strapi.documents(ARTICLE_UID).create({
        data: {
          title: 'Multi-cycle order test',
          categories: [categoryIds.Beta, categoryIds.Alpha, categoryIds.Gamma],
        },
      });
      await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });

      const cycles = [
        ['Alpha', 'Gamma', 'Beta'],
        ['Gamma', 'Beta', 'Alpha'],
        ['Beta', 'Alpha', 'Gamma'],
      ] as const;

      for (const names of cycles) {
        await strapi.documents(ARTICLE_UID).update({
          documentId: article.documentId,
          data: {
            categories: names.map((name) => categoryIds[name]),
          },
        });

        expect(await getDraftCategoryNames(article.documentId)).toEqual([...names]);

        await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });

        expect(await getPublishedCategoryNames(article.documentId)).toEqual([...names]);
        expect(await getDraftCategoryNames(article.documentId)).toEqual([...names]);
      }
    }
  );

  testInTransaction(
    'inverse-side article order on category is preserved after owning-side reorder republish',
    async () => {
      const categoryIds = {
        Alpha: await publishCategory('Alpha'),
        Beta: await publishCategory('Beta'),
        Gamma: await publishCategory('Gamma'),
      };

      const firstOnAlpha = await strapi.documents(ARTICLE_UID).create({
        data: {
          title: 'Inverse-first',
          categories: [categoryIds.Alpha],
        },
      });
      await strapi.documents(ARTICLE_UID).publish({ documentId: firstOnAlpha.documentId });

      const hub = await strapi.documents(ARTICLE_UID).create({
        data: {
          title: 'Inverse-hub',
          categories: [categoryIds.Beta, categoryIds.Alpha, categoryIds.Gamma],
        },
      });
      await strapi.documents(ARTICLE_UID).publish({ documentId: hub.documentId });

      const secondOnAlpha = await strapi.documents(ARTICLE_UID).create({
        data: {
          title: 'Inverse-second',
          categories: [categoryIds.Alpha],
        },
      });
      await strapi.documents(ARTICLE_UID).publish({ documentId: secondOnAlpha.documentId });

      expect(await getPublishedArticleTitlesOnCategory(categoryIds.Alpha)).toEqual([
        'Inverse-first',
        'Inverse-hub',
        'Inverse-second',
      ]);

      await strapi.documents(ARTICLE_UID).update({
        documentId: hub.documentId,
        data: {
          categories: [categoryIds.Alpha, categoryIds.Gamma, categoryIds.Beta],
        },
      });
      await strapi.documents(ARTICLE_UID).publish({ documentId: hub.documentId });

      expect(await getPublishedCategoryNames(hub.documentId)).toEqual(['Alpha', 'Gamma', 'Beta']);
      expect(await getPublishedArticleTitlesOnCategory(categoryIds.Alpha)).toEqual([
        'Inverse-first',
        'Inverse-hub',
        'Inverse-second',
      ]);
    }
  );

  testInTransaction(
    'related category republish after owning-side reorder does not revert article order',
    async () => {
      const categoryIds = {
        Alpha: await publishCategory('Alpha'),
        Beta: await publishCategory('Beta'),
        Gamma: await publishCategory('Gamma'),
      };

      const article = await strapi.documents(ARTICLE_UID).create({
        data: {
          title: 'Related republish order test',
          categories: [categoryIds.Beta, categoryIds.Alpha, categoryIds.Gamma],
        },
      });
      await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });

      await strapi.documents(ARTICLE_UID).update({
        documentId: article.documentId,
        data: {
          categories: [categoryIds.Alpha, categoryIds.Gamma, categoryIds.Beta],
        },
      });
      await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });

      expect(await getPublishedCategoryNames(article.documentId)).toEqual([
        'Alpha',
        'Gamma',
        'Beta',
      ]);

      await strapi.documents(CATEGORY_UID).update({
        documentId: categoryIds.Alpha,
        data: { name: 'Alpha-updated' },
      });
      await strapi.documents(CATEGORY_UID).publish({ documentId: categoryIds.Alpha });

      expect(await getPublishedCategoryNames(article.documentId)).toEqual([
        'Alpha-updated',
        'Gamma',
        'Beta',
      ]);
      expect(await getDraftCategoryNames(article.documentId)).toEqual([
        'Alpha-updated',
        'Gamma',
        'Beta',
      ]);
    }
  );
});
