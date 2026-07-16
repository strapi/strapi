/**
 * REST Content API coverage for empty populate sort (#26426).
 */
import type { Core } from '@strapi/types';

import { createTestSetup, destroyTestSetup } from '../../../../utils/builder-helper';
import { testInTransaction } from '../../../../utils';
import { createContentAPIRequest } from 'api-tests/request';
import {
  ARTICLE_UID,
  createMinimalArticleCategoryResources,
} from '../resources/minimal-article-category';

type ContentAPIRequest = ReturnType<typeof createContentAPIRequest>;

const resources = createMinimalArticleCategoryResources();

describe('Empty populate sort (REST Content API)', () => {
  let testUtils;
  let strapi: Core.Strapi;
  let rqContent: ContentAPIRequest;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
    rqContent = await createContentAPIRequest({ strapi });
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  const getArticleCategoriesViaRest = async (
    title: string,
    query: Record<string, unknown>
  ): Promise<string[]> => {
    const res = await rqContent({
      method: 'GET',
      url: '/articles',
      qs: {
        filters: { title: { $eq: title } },
        locale: 'en',
        status: 'draft',
        ...query,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);

    const categories = res.body.data[0].categories as Array<{ name: string }>;

    return categories.map((category) => category.name);
  };

  testInTransaction.each([
    ['empty string (sort=)', { populate: { categories: { sort: '' } } }],
    ['comma-only string', { populate: { categories: { sort: ',' } } }],
    ['array of empty strings (sort[0]=)', { populate: { categories: { sort: [''] } } }],
  ])('preserves connect order for REST %s', async (_label, query) => {
    const title = `REST empty populate sort ${_label}`;

    await strapi.documents(ARTICLE_UID).create({
      locale: 'en',
      data: {
        title,
        categories: ['Cat2', 'Cat1'],
      },
    });

    const names = await getArticleCategoriesViaRest(title, query);

    expect(names).toEqual(['Cat2-EN', 'Cat1-EN']);
  });
});
