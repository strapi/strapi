import type { Core, Modules } from '@strapi/types';

import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import resources from './resources/index';
import { ARTICLE_UID } from './utils';

let strapi: Core.Strapi;
let rqContent: (options: {
  method: string;
  url: string;
  qs?: Record<string, string>;
  body?: unknown;
}) => Promise<{ statusCode: number; body: { data?: unknown; errors?: unknown } }>;

const findArticles = async (params: Modules.Documents.ServiceParams['findMany']) => {
  return strapi.documents(ARTICLE_UID).findMany({ ...params });
};

const countArticles = async (params: Modules.Documents.ServiceParams['count']) => {
  return strapi.documents(ARTICLE_UID).count({ ...params });
};

describe('Document Service', () => {
  let testUtils;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
    const { createContentAPIRequest } = require('api-tests/request');
    rqContent = await createContentAPIRequest({ strapi });
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  describe('hasPublishedVersion parameter', () => {
    describe('findMany', () => {
      it('returns only never-published documents when hasPublishedVersion=false', async () => {
        const articles = await findArticles({
          status: 'draft',
          hasPublishedVersion: false,
        });

        expect(articles.length).toBeGreaterThan(0);

        // All returned articles should be from documents that have never been published
        // Fixture state defined in: tests/api/core/strapi/document-service/resources/fixtures/article.js
        // Article1 is never published, Article2 has a published version
        articles.forEach((article) => {
          expect(article.documentId).toBe('Article1');
          expect(article.publishedAt).toBe(null);
        });
      });

      it('returns only drafts of published documents when hasPublishedVersion=true', async () => {
        const articles = await findArticles({
          status: 'draft',
          hasPublishedVersion: true,
        });

        expect(articles.length).toBeGreaterThan(0);

        // All returned articles should be drafts of documents that have been published
        // Article2 has a published version
        articles.forEach((article) => {
          expect(article.documentId).toBe('Article2');
          expect(article.publishedAt).toBe(null);
        });
      });

      it('works with string values "true" and "false"', async () => {
        const neverPublished = await findArticles({
          status: 'draft',
          hasPublishedVersion: 'false',
        });

        const hasPublished = await findArticles({
          status: 'draft',
          hasPublishedVersion: 'true',
        });

        expect(neverPublished.length).toBeGreaterThan(0);
        expect(hasPublished.length).toBeGreaterThan(0);

        neverPublished.forEach((article) => {
          expect(article.documentId).toBe('Article1');
        });

        hasPublished.forEach((article) => {
          expect(article.documentId).toBe('Article2');
        });
      });

      it('returns all drafts when hasPublishedVersion is not specified', async () => {
        const allDrafts = await findArticles({
          status: 'draft',
        });

        const documentIds = [...new Set(allDrafts.map((a) => a.documentId))];

        // Should include both Article1 and Article2
        expect(documentIds).toContain('Article1');
        expect(documentIds).toContain('Article2');
      });

      it('works with locale parameter', async () => {
        const articles = await findArticles({
          status: 'draft',
          hasPublishedVersion: false,
          locale: 'nl',
        });

        expect(articles.length).toBe(1);
        expect(articles[0].documentId).toBe('Article1');
        expect(articles[0].locale).toBe('nl');
      });

      it('works with locale="*"', async () => {
        const articles = await findArticles({
          status: 'draft',
          hasPublishedVersion: false,
          locale: '*',
        });

        // Article1 has drafts in en, nl, it
        expect(articles.length).toBe(3);

        const locales = articles.map((a) => a.locale);
        expect(locales).toContain('en');
        expect(locales).toContain('nl');
        expect(locales).toContain('it');
      });
    });

    describe('findFirst', () => {
      it('returns a never-published document when hasPublishedVersion=false', async () => {
        const article = await strapi.documents(ARTICLE_UID).findFirst({
          status: 'draft',
          hasPublishedVersion: false,
        });

        expect(article).not.toBeNull();
        expect(article?.documentId).toBe('Article1');
        expect(article?.publishedAt).toBe(null);
      });

      it('returns a draft of a published document when hasPublishedVersion=true', async () => {
        const article = await strapi.documents(ARTICLE_UID).findFirst({
          status: 'draft',
          hasPublishedVersion: true,
        });

        expect(article).not.toBeNull();
        expect(article?.documentId).toBe('Article2');
        expect(article?.publishedAt).toBe(null);
      });
    });

    describe('count', () => {
      it('counts only never-published documents when hasPublishedVersion=false', async () => {
        const count = await countArticles({
          status: 'draft',
          hasPublishedVersion: false,
        });

        const articles = await findArticles({
          status: 'draft',
          hasPublishedVersion: false,
        });

        expect(count).toBe(articles.length);
      });

      it('counts only drafts of published documents when hasPublishedVersion=true', async () => {
        const count = await countArticles({
          status: 'draft',
          hasPublishedVersion: true,
        });

        const articles = await findArticles({
          status: 'draft',
          hasPublishedVersion: true,
        });

        expect(count).toBe(articles.length);
      });
    });

    describe('validation', () => {
      it('throws ValidationError for invalid string values', async () => {
        await expect(
          findArticles({
            status: 'draft',
            hasPublishedVersion: 'yes' as any,
          })
        ).rejects.toThrow(
          "Invalid value for 'hasPublishedVersion'. Expected boolean or 'true'/'false' string."
        );
      });

      it('throws ValidationError for numeric values', async () => {
        await expect(
          findArticles({
            status: 'draft',
            hasPublishedVersion: 1 as any,
          })
        ).rejects.toThrow(
          "Invalid value for 'hasPublishedVersion'. Expected boolean or 'true'/'false' string."
        );
      });

      it('throws ValidationError for "0" string', async () => {
        await expect(
          findArticles({
            status: 'draft',
            hasPublishedVersion: '0' as any,
          })
        ).rejects.toThrow(
          "Invalid value for 'hasPublishedVersion'. Expected boolean or 'true'/'false' string."
        );
      });

      it('throws ValidationError for "1" string', async () => {
        await expect(
          findArticles({
            status: 'draft',
            hasPublishedVersion: '1' as any,
          })
        ).rejects.toThrow(
          "Invalid value for 'hasPublishedVersion'. Expected boolean or 'true'/'false' string."
        );
      });

      it('throws ValidationError for empty string', async () => {
        await expect(
          findArticles({
            status: 'draft',
            hasPublishedVersion: '' as any,
          })
        ).rejects.toThrow(
          "Invalid value for 'hasPublishedVersion'. Expected boolean or 'true'/'false' string."
        );
      });

      it('throws ValidationError for array values', async () => {
        await expect(
          findArticles({
            status: 'draft',
            hasPublishedVersion: [true] as any,
          })
        ).rejects.toThrow(
          "Invalid value for 'hasPublishedVersion'. Expected boolean or 'true'/'false' string."
        );
      });

      it('throws ValidationError for object values', async () => {
        await expect(
          findArticles({
            status: 'draft',
            hasPublishedVersion: { value: true } as any,
          })
        ).rejects.toThrow(
          "Invalid value for 'hasPublishedVersion'. Expected boolean or 'true'/'false' string."
        );
      });
    });

    describe('edge cases', () => {
      it('returns empty results for status=published with hasPublishedVersion=false', async () => {
        // Logically contradictory: published documents always have a published version
        const articles = await findArticles({
          status: 'published',
          hasPublishedVersion: false,
        });

        expect(articles.length).toBe(0);
      });

      it('works when combined with filters', async () => {
        const articles = await findArticles({
          status: 'draft',
          hasPublishedVersion: false,
          filters: { title: { $contains: 'Article1' } },
        });

        expect(articles.length).toBeGreaterThan(0);
        articles.forEach((article) => {
          expect(article.documentId).toBe('Article1');
          expect(article.title).toContain('Article1');
        });
      });

      it('is not overwritten by documentId filter in findMany', async () => {
        // Article2 has a published version, so hasPublishedVersion=false should exclude it
        // even when explicitly filtering by its documentId
        const articles = await findArticles({
          status: 'draft',
          hasPublishedVersion: false,
          filters: { documentId: { $in: ['Article2'] } },
        });

        expect(articles.length).toBe(0);
      });

      it('is not overwritten by documentId in findOne', async () => {
        // Article2 has a published version, so hasPublishedVersion=false should return null
        const article = await strapi.documents(ARTICLE_UID).findOne({
          documentId: 'Article2',
          status: 'draft',
          hasPublishedVersion: false,
        });

        expect(article).toBeNull();
      });

      it('is not overwritten by documentId filter in findMany with hasPublishedVersion=true', async () => {
        // Article1 has never been published, so hasPublishedVersion=true should exclude it
        // even when explicitly filtering by its documentId
        const articles = await findArticles({
          status: 'draft',
          hasPublishedVersion: true,
          filters: { documentId: { $in: ['Article1'] } },
        });

        expect(articles.length).toBe(0);
      });

      it('is not overwritten by documentId in findOne with hasPublishedVersion=true', async () => {
        // Article1 has never been published, so hasPublishedVersion=true should return null
        const article = await strapi.documents(ARTICLE_UID).findOne({
          documentId: 'Article1',
          status: 'draft',
          hasPublishedVersion: true,
        });

        expect(article).toBeNull();
      });

      it('returns document when documentId and hasPublishedVersion are consistent in findOne', async () => {
        // Article2 has a published version, so hasPublishedVersion=true should still return it
        const article = await strapi.documents(ARTICLE_UID).findOne({
          documentId: 'Article2',
          status: 'draft',
          hasPublishedVersion: true,
        });

        expect(article).not.toBeNull();
        expect(article?.documentId).toBe('Article2');
      });

      it('returns document when documentId filter and hasPublishedVersion are consistent in findMany', async () => {
        // Article1 has never been published, so hasPublishedVersion=false should still return it
        const articles = await findArticles({
          status: 'draft',
          hasPublishedVersion: false,
          filters: { documentId: { $in: ['Article1'] } },
        });

        expect(articles.length).toBeGreaterThan(0);
        articles.forEach((article) => {
          expect(article.documentId).toBe('Article1');
        });
      });
    });

    describe('REST API', () => {
      it('GET /api/articles with status=draft&hasPublishedVersion=false returns only never-published documents', async () => {
        const res = await rqContent({
          method: 'GET',
          url: '/articles',
          qs: { status: 'draft', hasPublishedVersion: 'false' },
        });

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
        res.body.data.forEach((article: { documentId: string; publishedAt: unknown }) => {
          expect(article.documentId).toBe('Article1');
          expect(article.publishedAt).toBeNull();
        });
      });

      it('GET /api/articles with status=draft&hasPublishedVersion=true returns only drafts of published documents', async () => {
        const res = await rqContent({
          method: 'GET',
          url: '/articles',
          qs: { status: 'draft', hasPublishedVersion: 'true' },
        });

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
        res.body.data.forEach((article: { documentId: string; publishedAt: unknown }) => {
          expect(article.documentId).toBe('Article2');
          expect(article.publishedAt).toBeNull();
        });
      });

      it('GET /api/articles with invalid hasPublishedVersion returns 400', async () => {
        const res = await rqContent({
          method: 'GET',
          url: '/articles',
          qs: { status: 'draft', hasPublishedVersion: 'invalid' },
        });

        expect(res.statusCode).toBe(400);
      });
    });

    describe('GraphQL', () => {
      it('query with status DRAFT and hasPublishedVersion false returns only never-published documents', async () => {
        const res = await testUtils.rq.admin({
          method: 'POST',
          url: '/graphql',
          body: {
            query: /* GraphQL */ `
              query {
                articles_connection(status: DRAFT, hasPublishedVersion: false) {
                  data {
                    documentId
                    attributes {
                      publishedAt
                    }
                  }
                }
              }
            `,
          },
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.errors).toBeUndefined();
        const data = res.body.data?.articles_connection?.data ?? [];
        expect(data.length).toBeGreaterThan(0);
        data.forEach((article: { documentId: string; attributes: { publishedAt: unknown } }) => {
          expect(article.documentId).toBe('Article1');
          expect(article.attributes.publishedAt).toBeNull();
        });
      });
    });

    describe('populate', () => {
      it('works with populate when hasPublishedVersion is set', async () => {
        const articles = await findArticles({
          status: 'draft',
          hasPublishedVersion: false,
          populate: ['categories'],
        });

        expect(articles.length).toBeGreaterThan(0);
        articles.forEach((article) => {
          expect(article.documentId).toBe('Article1');
          expect(article).toHaveProperty('categories');
        });
        // Article1 (en) has categories [Cat1-EN]
        const withCategories = articles.filter(
          (a) => Array.isArray(a.categories) && a.categories.length > 0
        );
        expect(withCategories.length).toBeGreaterThan(0);
      });
    });
  });
});
