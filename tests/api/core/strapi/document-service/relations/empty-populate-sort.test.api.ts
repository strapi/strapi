/**
 * Empty populate sort must not set orderBy, so join-table connect order is preserved (#26426).
 *
 * GraphQL nested fields default to sort: []. REST can send other empty shapes via qs.
 */
import type { Core } from '@strapi/types';
import qs from 'qs';

import { createTestSetup, destroyTestSetup } from '../../../../utils/builder-helper';
import resources from '../resources/index';
import { ARTICLE_UID } from '../utils';
import { testInTransaction } from '../../../../utils';
import { createContentAPIRequest } from 'api-tests/request';

type ContentAPIRequest = ReturnType<typeof createContentAPIRequest>;

const categoryNames = (article: { categories: Array<{ name: string }> }) =>
  article.categories.map((category) => category.name);

describe('Empty populate sort', () => {
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

  describe('Document Service', () => {
    testInTransaction(
      'preserves manyToMany connect order when nested sort is omitted',
      async () => {
        const article = await strapi.documents(ARTICLE_UID).create({
          locale: 'en',
          data: {
            title: 'Empty populate sort omitted',
            categories: ['Cat2', 'Cat1'],
          },
          populate: { categories: true },
        });

        expect(categoryNames(article)).toEqual(['Cat2-EN', 'Cat1-EN']);
      }
    );

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

  describe('REST Content API', () => {
    const qsParseSettings = { strictNullHandling: true, arrayLimit: 100, depth: 20 };

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

    testInTransaction(
      'preserves connect order for REST populate[categories][sort][] (qs empty array)',
      async () => {
        const title = 'REST populate sort bracket empty array';

        await strapi.documents(ARTICLE_UID).create({
          locale: 'en',
          data: {
            title,
            categories: ['Cat2', 'Cat1'],
          },
        });

        const queryString = qs.stringify(
          {
            filters: { title: { $eq: title } },
            locale: 'en',
            status: 'draft',
            populate: { categories: { sort: [] } },
          },
          { allowEmptyArrays: true }
        );

        const parsed = qs.parse(queryString, qsParseSettings);
        expect(parsed.populate).toEqual({ categories: { sort: [null] } });

        const res = await rqContent({
          method: 'GET',
          url: `/articles?${queryString}`,
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.data).toHaveLength(1);

        const names = (res.body.data[0].categories as Array<{ name: string }>).map(
          (category) => category.name
        );

        expect(names).toEqual(['Cat2-EN', 'Cat1-EN']);
      }
    );
  });
});
