/**
 * Reproduction: M2M relation order must be preserved on the PUBLISHED version
 * after reordering relations in the draft and re-publishing.
 *
 * Scenario (from issue report):
 * 1. Create categories Alpha, Beta, Gamma.
 * 2. Create Article with categories [Beta, Alpha, Gamma] and publish.
 *    -> draft and published both show [Beta, Alpha, Gamma].
 * 3. Reorder the draft's categories to [Alpha, Gamma, Beta] and publish again.
 *    -> EXPECTED: published version shows [Alpha, Gamma, Beta] (same as draft).
 *    -> BUG: published version stays [Beta, Alpha, Gamma].
 */
import type { Core, UID } from '@strapi/types';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

let strapi: Core.Strapi;
const builder = createTestBuilder();
let rq;

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

describe('M2M relation order preserved on re-publish after reorder', () => {
  const categoryIds: Record<string, string> = {};
  let articleId: string;

  beforeAll(async () => {
    await builder.addContentTypes([categoryModel, articleModel]).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    for (const name of ['Alpha', 'Beta', 'Gamma']) {
      const category = await strapi.documents(CATEGORY_UID).create({ data: { name } });
      await strapi.documents(CATEGORY_UID).publish({ documentId: category.documentId });
      categoryIds[name] = category.documentId;
    }
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('initial publish keeps connect order [Beta, Alpha, Gamma]', async () => {
    const article = await strapi.documents(ARTICLE_UID).create({
      data: {
        title: 'Order test',
        categories: [categoryIds.Beta, categoryIds.Alpha, categoryIds.Gamma],
      },
    });
    articleId = article.documentId;

    await strapi.documents(ARTICLE_UID).publish({ documentId: articleId });

    expect(await getDraftCategoryNames(articleId)).toEqual(['Beta', 'Alpha', 'Gamma']);
    expect(await getPublishedCategoryNames(articleId)).toEqual(['Beta', 'Alpha', 'Gamma']);
  });

  test('reorder draft to [Alpha, Gamma, Beta] then publish -> published matches draft', async () => {
    await strapi.documents(ARTICLE_UID).update({
      documentId: articleId,
      data: {
        categories: [categoryIds.Alpha, categoryIds.Gamma, categoryIds.Beta],
      },
    });

    // Draft reflects the new order immediately
    expect(await getDraftCategoryNames(articleId)).toEqual(['Alpha', 'Gamma', 'Beta']);

    await strapi.documents(ARTICLE_UID).publish({ documentId: articleId });

    // Published must now match the reordered draft
    expect(await getPublishedCategoryNames(articleId)).toEqual(['Alpha', 'Gamma', 'Beta']);
    expect(await getDraftCategoryNames(articleId)).toEqual(['Alpha', 'Gamma', 'Beta']);
  });
});
