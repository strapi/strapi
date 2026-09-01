'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;
let graphqlQuery;

const articleModel = {
  attributes: {
    title: {
      type: 'string',
    },
  },
  draftAndPublish: true,
  singularName: 'article',
  pluralName: 'articles',
  displayName: 'Article',
  description: '',
  collectionName: '',
};

const categoryModel = {
  attributes: {
    name: {
      type: 'string',
    },
    articles: {
      type: 'relation',
      relation: 'manyToMany',
      target: 'api::article.article',
      targetAttribute: 'categories',
    },
  },
  draftAndPublish: true,
  singularName: 'category',
  pluralName: 'categories',
  displayName: 'Category',
  description: '',
  collectionName: '',
};

// category-1: has both draft and published versions
// category-2: draft only (never published)
const categories = [
  { name: 'Category 1', documentId: 'category-1', publishedAt: null },
  { name: 'Category 1', documentId: 'category-1', publishedAt: new Date() },
  { name: 'Category 2', documentId: 'category-2', publishedAt: null },
];

// article-1: draft only (never published), linked to both categories
// article-2: has both draft and published versions, linked to both categories
const articles = ({ category: categoryFixtures }) => {
  const categoryIds = categoryFixtures.map((c) => c.id);

  return [
    { title: 'Article 1', documentId: 'article-1', publishedAt: null, categories: categoryIds },
    { title: 'Article 2', documentId: 'article-2', publishedAt: null, categories: categoryIds },
    {
      title: 'Article 2',
      documentId: 'article-2',
      publishedAt: new Date(),
      categories: categoryIds,
    },
  ];
};

describe('Test GraphQL publicationFilter', () => {
  beforeAll(async () => {
    await builder
      .addContentType(articleModel)
      .addContentType(categoryModel)
      .addFixtures(categoryModel.singularName, categories)
      .addFixtures(articleModel.singularName, articles)
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    graphqlQuery = (body) => {
      return rq({
        url: '/graphql',
        method: 'POST',
        body,
      });
    };
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('publicationFilter without user filters', () => {
    test('publicationFilter NEVER_PUBLISHED returns only never-published drafts', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            articles(status: DRAFT, publicationFilter: NEVER_PUBLISHED) {
              documentId
              title
            }
          }
        `,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.articles).toHaveLength(1);
      expect(res.body.data.articles[0].documentId).toBe('article-1');
      expect(res.body.data.articles[0].title).toBe('Article 1');
    });

    test('publicationFilter HAS_PUBLISHED_VERSION returns only drafts that have a published version', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            articles(status: DRAFT, publicationFilter: HAS_PUBLISHED_VERSION) {
              documentId
              title
            }
          }
        `,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.articles).toHaveLength(1);
      expect(res.body.data.articles[0].documentId).toBe('article-2');
      expect(res.body.data.articles[0].title).toBe('Article 2');
    });

    test('publicationFilter works with _connection query', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            articles_connection(status: DRAFT, publicationFilter: NEVER_PUBLISHED) {
              nodes {
                documentId
                title
              }
              pageInfo {
                total
              }
            }
          }
        `,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.articles_connection.nodes).toHaveLength(1);
      expect(res.body.data.articles_connection.nodes[0].documentId).toBe('article-1');
      expect(res.body.data.articles_connection.pageInfo.total).toBe(1);
    });

    test('HAS_PUBLISHED_VERSION cascades into populated relations', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            articles(status: DRAFT, publicationFilter: HAS_PUBLISHED_VERSION) {
              documentId
              categories {
                name
              }
            }
          }
        `,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.articles).toHaveLength(1);
      expect(res.body.data.articles[0].documentId).toBe('article-2');
      expect(res.body.data.articles[0].categories).toEqual([{ name: 'Category 1' }]);
    });

    test('NEVER_PUBLISHED cascades into populated relations', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            articles(status: DRAFT, publicationFilter: NEVER_PUBLISHED) {
              documentId
              categories {
                name
              }
            }
          }
        `,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.articles).toHaveLength(1);
      expect(res.body.data.articles[0].documentId).toBe('article-1');
      expect(res.body.data.articles[0].categories).toEqual([{ name: 'Category 2' }]);
    });
  });

  test('Omitting publicationFilter returns all drafts', async () => {
    const res = await graphqlQuery({
      query: /* GraphQL */ `
        {
          articles(status: DRAFT) {
            documentId
            title
          }
        }
      `,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.articles).toHaveLength(2);

    const documentIds = res.body.data.articles.map((a) => a.documentId).sort();
    expect(documentIds).toEqual(['article-1', 'article-2']);
  });

  test('filters and publicationFilter work together in the same query', async () => {
    const res = await graphqlQuery({
      query: /* GraphQL */ `
        {
          articles_connection(
            status: DRAFT
            publicationFilter: NEVER_PUBLISHED
            filters: { title: { eq: "Article 1" } }
          ) {
            nodes {
              documentId
              title
            }
            pageInfo {
              total
            }
          }
        }
      `,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.articles_connection.nodes).toHaveLength(1);
    expect(res.body.data.articles_connection.nodes[0].documentId).toBe('article-1');
    expect(res.body.data.articles_connection.nodes[0].title).toBe('Article 1');
    expect(res.body.data.articles_connection.pageInfo.total).toBe(1);
  });

  test('publicationFilter NEVER_PUBLISHED_DOCUMENT (document-scoped) returns only never-published drafts', async () => {
    const res = await graphqlQuery({
      query: /* GraphQL */ `
        {
          articles(status: DRAFT, publicationFilter: NEVER_PUBLISHED_DOCUMENT) {
            documentId
            title
          }
        }
      `,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.articles).toHaveLength(1);
    expect(res.body.data.articles[0].documentId).toBe('article-1');
  });

  test('publicationFilter HAS_PUBLISHED_VERSION_DOCUMENT returns draft rows for documents with any published locale', async () => {
    const res = await graphqlQuery({
      query: /* GraphQL */ `
        {
          articles(status: DRAFT, publicationFilter: HAS_PUBLISHED_VERSION_DOCUMENT) {
            documentId
            title
          }
        }
      `,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.articles).toHaveLength(1);
    expect(res.body.data.articles[0].documentId).toBe('article-2');
  });

  test('publicationFilter PUBLISHED_WITH_DRAFT returns published rows that have a draft peer (same pair)', async () => {
    const res = await graphqlQuery({
      query: /* GraphQL */ `
        {
          articles(status: PUBLISHED, publicationFilter: PUBLISHED_WITH_DRAFT) {
            documentId
            title
          }
        }
      `,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.articles).toHaveLength(1);
    expect(res.body.data.articles[0].documentId).toBe('article-2');
  });

  describe('findOne (article by documentId)', () => {
    test('publicationFilter NEVER_PUBLISHED returns the matching draft document', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            article(documentId: "article-1", status: DRAFT, publicationFilter: NEVER_PUBLISHED) {
              documentId
              title
            }
          }
        `,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.article).not.toBeNull();
      expect(res.body.data.article.documentId).toBe('article-1');
      expect(res.body.data.article.title).toBe('Article 1');
    });

    test('publicationFilter HAS_PUBLISHED_VERSION yields null for a never-published documentId', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            article(
              documentId: "article-1"
              status: DRAFT
              publicationFilter: HAS_PUBLISHED_VERSION
            ) {
              documentId
              title
            }
          }
        `,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.article).toBeNull();
    });
  });

  describe('publicationFilter MODIFIED and UNMODIFIED (document service parity)', () => {
    const articleUid = 'api::article.article';
    const titleModified = 'GQL-PF-Modified-v2';
    const titleUnmodified = 'GQL-PF-Unmodified-v1';

    beforeAll(async () => {
      const modifiedDraft = await strapi.documents(articleUid).create({
        status: 'draft',
        locale: 'en',
        data: { title: 'GQL-PF-Modified-v1' },
      });
      await strapi.documents(articleUid).publish({
        documentId: modifiedDraft.documentId,
        locale: 'en',
      });
      await strapi.documents(articleUid).update({
        status: 'draft',
        documentId: modifiedDraft.documentId,
        locale: 'en',
        data: { title: titleModified },
      });

      const unmodifiedDraft = await strapi.documents(articleUid).create({
        status: 'draft',
        locale: 'en',
        data: { title: titleUnmodified },
      });
      await strapi.documents(articleUid).publish({
        documentId: unmodifiedDraft.documentId,
        locale: 'en',
      });
    });

    test('MODIFIED returns only drafts whose draft row is newer than the published peer (same pair)', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            articles(
              status: DRAFT
              publicationFilter: MODIFIED
              filters: { title: { eq: "${titleModified}" } }
            ) {
              documentId
              title
            }
          }
        `,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.articles).toHaveLength(1);
      expect(res.body.data.articles[0].title).toBe(titleModified);
    });

    test('UNMODIFIED returns only drafts that are not newer than the published peer', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            articles(
              status: DRAFT
              publicationFilter: UNMODIFIED
              filters: { title: { eq: "${titleUnmodified}" } }
            ) {
              documentId
              title
            }
          }
        `,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.articles).toHaveLength(1);
      expect(res.body.data.articles[0].title).toBe(titleUnmodified);
    });

    test('articles_connection counts MODIFIED rows correctly (pagination resolver)', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            articles_connection(
              status: DRAFT
              publicationFilter: MODIFIED
              filters: { title: { eq: "${titleModified}" } }
            ) {
              nodes {
                documentId
              }
              pageInfo {
                total
              }
            }
          }
        `,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.articles_connection.nodes).toHaveLength(1);
      expect(res.body.data.articles_connection.pageInfo.total).toBe(1);
    });
  });

  test('publicationFilter PUBLISHED_WITHOUT_DRAFT returns no rows when every published row has a draft peer', async () => {
    const res = await graphqlQuery({
      query: /* GraphQL */ `
        {
          articles(status: PUBLISHED, publicationFilter: PUBLISHED_WITHOUT_DRAFT) {
            documentId
            title
          }
        }
      `,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.articles).toHaveLength(0);
  });
});
