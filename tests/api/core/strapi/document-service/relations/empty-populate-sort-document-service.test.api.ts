/**
 * Empty populate sort must not set orderBy, so join-table connect order is preserved (#26426).
 *
 * GraphQL nested fields default to sort: []. REST clients typically omit sort or send empty
 * strings (see REST cases in empty-populate-sort-rest.test.api.ts). qs `sort[]` → `[null]` is
 * covered in @strapi/utils unit tests.
 */
import type { Core } from '@strapi/types';

import { createTestSetup, destroyTestSetup } from '../../../../utils/builder-helper';
import { testInTransaction } from '../../../../utils';
import {
  ARTICLE_UID,
  createMinimalArticleCategoryResources,
} from '../resources/minimal-article-category';

const categoryNames = (article: { categories: Array<{ name: string }> }) =>
  article.categories.map((category) => category.name);

const resources = createMinimalArticleCategoryResources();

describe('Empty populate sort (Document Service)', () => {
  let testUtils;
  let strapi: Core.Strapi;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  testInTransaction('preserves manyToMany connect order when nested sort is omitted', async () => {
    const article = await strapi.documents(ARTICLE_UID).create({
      locale: 'en',
      data: {
        title: 'Empty populate sort omitted',
        categories: ['Cat2', 'Cat1'],
      },
      populate: { categories: true },
    });

    expect(categoryNames(article)).toEqual(['Cat2-EN', 'Cat1-EN']);
  });

  testInTransaction.each([
    ['empty array (GraphQL default)', { sort: [] }],
    ['empty string', { sort: '' }],
    ['empty object', { sort: {} }],
  ])(
    'preserves manyToMany connect order when populate sort is %s',
    async (_label, populateCategories) => {
      const article = await strapi.documents(ARTICLE_UID).create({
        locale: 'en',
        data: {
          title: `Empty populate sort ${_label}`,
          categories: ['Cat2', 'Cat1'],
        },
        populate: { categories: populateCategories },
      });

      expect(categoryNames(article)).toEqual(['Cat2-EN', 'Cat1-EN']);
    }
  );
});
