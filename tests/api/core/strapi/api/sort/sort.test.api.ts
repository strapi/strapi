'use strict';

import type { Core } from '@strapi/strapi';

import { createTestBuilder } from 'api-tests/builder';
import { createContentAPIRequest } from 'api-tests/request';
import { createStrapiInstance } from 'api-tests/strapi';

const builder = createTestBuilder();

let strapi: Core.Strapi;
let data;
let rq;

const cat = (letter: string) => {
  return data.category.find((c) => c.name.toLowerCase().endsWith(letter));
};

const article = (letter: string) => {
  return data.article.find((a) => a.title.toLowerCase().endsWith(letter));
};

const expectArticle = (letter: string) => {
  const { id, title } = article(letter);

  return {
    id,
    title,
    locale: 'en',
    documentId: expect.any(String),
    publishedAt: expect.anything(),
    updatedAt: expect.anything(),
    createdAt: expect.anything(),
  };
};

const schemas = {
  contentTypes: {
    tag: {
      options: {
        populateCreatorFields: true,
      },
      attributes: {
        name: {
          type: 'string',
        },
      },
      displayName: 'Tag',
      singularName: 'tag',
      pluralName: 'tags',
      description: '',
      collectionName: '',
    },
    category: {
      options: {
        populateCreatorFields: true,
      },
      attributes: {
        name: {
          type: 'string',
        },
        tags: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::tag.tag',
        },
      },
      displayName: 'Categories',
      singularName: 'category',
      pluralName: 'categories',
      description: '',
      collectionName: '',
    },
    article: {
      options: {
        populateCreatorFields: true,
      },
      attributes: {
        title: {
          type: 'string',
        },
        categories: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::category.category',
        },
        primary: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::category.category',
        },
        relatedArticles: {
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::article.article',
        },
      },
      displayName: 'Article',
      singularName: 'article',
      pluralName: 'articles',
      description: '',
      collectionName: '',
    },
  },
};

const fixtures = {
  category: (fixtures) => [
    {
      name: 'Category A',
      locale: 'en',
      tags: fixtures.tag.filter((tag) => tag.name.endsWith('B')).map((cat) => cat.id),
    },
    {
      name: 'Category C',
      locale: 'en',
      tags: fixtures.tag
        .filter((tag) => tag.name.endsWith('D') || tag.name.endsWith('A'))
        .map((cat) => cat.id),
    },
    {
      name: 'Category B',
      locale: 'en',
      tags: fixtures.tag.filter((tag) => tag.name.endsWith('C')).map((cat) => cat.id),
    },
    {
      name: 'Category D',
      locale: 'en',
      tags: fixtures.tag.filter((tag) => tag.name.endsWith('A')).map((cat) => cat.id),
    },
  ],
  tag: [{ name: 'Tag A' }, { name: 'Tag B' }, { name: 'Tag C' }, { name: 'Tag D' }],
  articles(fixtures) {
    return [
      {
        title: 'Article A',
        locale: 'en',
        categories: fixtures.category.filter((cat) => cat.name.endsWith('B')).map((cat) => cat.id),
      },
      {
        title: 'Article C',
        locale: 'en',
        categories: fixtures.category.filter((cat) => cat.name.endsWith('D')).map((cat) => cat.id),
      },
      {
        title: 'Article D',
        locale: 'en',
        categories: fixtures.category
          .filter((cat) => cat.name.endsWith('A') || cat.name.endsWith('D'))
          .map((cat) => cat.id),
      },
      {
        title: 'Article B',
        locale: 'en',
        categories: fixtures.category
          .filter((cat) => cat.name.endsWith('C') || cat.name.endsWith('D'))
          .map((cat) => cat.id),
      },
    ];
  },
};

/**
 * Article(A) -> Categories(B)
 * Article(B) -> Categories(C, D)
 * Article(C) -> Categories(D)
 * Article(D) -> Categories(A, D)
 *
 * Category(A) -> Tags(B)
 * Category(B) -> Tags(C)
 * Category(C) -> Tags(A, D)
 * Category(D) -> Tags(A)
 *
 * 1 - Article(A) -> Categories(B) -> Tags(C)
 * 4 - Article(B) -> Categories(C, D) -> Tags(A, D)
 * 2 - Article(C) -> Categories(D) -> Tags(A)
 * 3 - Article(D) -> Categories(A, D) -> Tags(A, B)
 */
describe('Sort', () => {
  beforeAll(async () => {
    await builder
      .addContentTypes(Object.values(schemas.contentTypes))
      .addFixtures(schemas.contentTypes.tag.singularName, fixtures.tag)
      .addFixtures(schemas.contentTypes.category.singularName, fixtures.category)
      .addFixtures(schemas.contentTypes.article.singularName, fixtures.articles)
      .build();

    strapi = await createStrapiInstance();
    rq = createContentAPIRequest({ strapi });
    data = await builder.sanitizedFixtures(strapi);
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Regular sort', async () => {
    const res = await rq.get(`/${schemas.contentTypes.article.pluralName}`, {
      qs: { sort: 'title' },
    });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(4);

    expect(res.body.data).toMatchObject([
      expectArticle('a'),
      expectArticle('b'),
      expectArticle('c'),
      expectArticle('d'),
    ]);
  });

  test('Deep Sort (1st level)', async () => {
    const res = await rq.get(`/${schemas.contentTypes.article.pluralName}`, {
      qs: { sort: 'categories.name', populate: 'categories' },
    });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(4);

    expect(res.body.data).toMatchObject([
      { ...expectArticle('d'), categories: [cat('a'), cat('d')] },
      { ...expectArticle('a'), categories: [cat('b')] },
      { ...expectArticle('b'), categories: [cat('c'), cat('d')] },
      { ...expectArticle('c'), categories: [cat('d')] },
    ]);
  });

  test('Deep Sort (2nd level)', async () => {
    const res = await rq.get(`/${schemas.contentTypes.article.pluralName}`, {
      qs: { sort: 'categories.tags.name', populate: 'categories.tags' },
    });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(4);

    expect(res.body.data).toMatchObject([
      { ...expectArticle('c'), categories: [cat('d')] },
      { ...expectArticle('d'), categories: [cat('a'), cat('d')] },
      { ...expectArticle('b'), categories: [cat('c'), cat('d')] },
      { ...expectArticle('a'), categories: [cat('b')] },
    ]);
  });

  test('Deep sort (2nd level) + Regular sort', async () => {
    const res = await rq.get(`/${schemas.contentTypes.article.pluralName}`, {
      qs: { sort: ['categories.name:desc', 'title:asc'], populate: 'categories' },
    });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(4);

    expect(res.body.data).toMatchObject([
      { ...expectArticle('b'), categories: [cat('c'), cat('d')] },
      { ...expectArticle('c'), categories: [cat('d')] },
      { ...expectArticle('d'), categories: [cat('a'), cat('d')] },
      { ...expectArticle('a'), categories: [cat('b')] },
    ]);
  });

  test('2 Deep Sort (2nd level + 1st level)', async () => {
    const res = await rq.get(`/${schemas.contentTypes.article.pluralName}`, {
      qs: { sort: ['categories.tags.name', 'categories.name'], populate: 'categories.tags' },
    });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(4);

    expect(res.body.data).toMatchObject([
      { ...expectArticle('d'), categories: [cat('a'), cat('d')] },
      { ...expectArticle('b'), categories: [cat('c'), cat('d')] },
      { ...expectArticle('c'), categories: [cat('d')] },
      { ...expectArticle('a'), categories: [cat('b')] },
    ]);
  });

  test('Deep sort (2st level) + Pagination (start/limit)', async () => {
    const res = await rq.get(`/${schemas.contentTypes.article.pluralName}`, {
      qs: {
        sort: 'categories.tags.name',
        pagination: { start: 1, limit: 2 },
        populate: 'categories.tags',
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);

    expect(res.body.data).toMatchObject([
      { ...expectArticle('d'), categories: [cat('a'), cat('d')] },
      { ...expectArticle('b'), categories: [cat('c'), cat('d')] },
    ]);
  });

  test('Deep sort (1st level) + Pagination (page/pageSize)', async () => {
    const pageSize = 3;

    const page1 = await rq.get(`/${schemas.contentTypes.article.pluralName}`, {
      qs: { sort: 'categories.name', populate: 'categories', pagination: { pageSize, page: 1 } },
    });

    const page2 = await rq.get(`/${schemas.contentTypes.article.pluralName}`, {
      qs: { sort: 'categories.name', populate: 'categories', pagination: { pageSize, page: 2 } },
    });

    expect(page1.status).toBe(200);
    expect(page1.body.data.length).toBe(3);

    expect(page2.status).toBe(200);
    expect(page2.body.data.length).toBe(1);

    // Page 1
    expect(page1.body.data).toMatchObject([
      { ...expectArticle('d'), categories: [cat('a'), cat('d')] },
      { ...expectArticle('a'), categories: [cat('b')] },
      { ...expectArticle('b'), categories: [cat('c'), cat('d')] },
    ]);

    expect(page1.body.meta).toMatchObject({
      pagination: { page: 1, pageSize, pageCount: 2, total: 4 },
    });

    // Page 2
    expect(page2.body.data).toMatchObject([{ ...expectArticle('c'), categories: [cat('d')] }]);

    expect(page2.body.meta).toMatchObject({
      pagination: { page: 2, pageSize, pageCount: 2, total: 4 },
    });
  });

  test('Deep sort (1st level) + Filters', async () => {
    const res = await rq.get(`/${schemas.contentTypes.article.pluralName}`, {
      qs: {
        sort: ['categories.name:ASC', 'title:DESC'],
        filters: { title: { $ne: 'Article B' } },
      },
    });

    expect(res.body.data).toMatchObject([
      { ...expectArticle('d') },
      { ...expectArticle('a') },
      { ...expectArticle('c') },
    ]);
  });

  // This one will fail because we don't support deep sort with deep filter
  // The where and orderBy will be applied to two different joins (instead of a single one), impacting the results
  test.skip('Deep sort (1st level) + Deep filters (1st level)', async () => {
    const res = await rq.get(`/${schemas.contentTypes.article.pluralName}`, {
      qs: {
        sort: ['categories.name:ASC', 'title:DESC'],
        filters: { categories: { name: { $ne: 'Category C' } } },
      },
    });

    expect(res.body.data).toMatchObject([
      { ...expectArticle('d') },
      { ...expectArticle('a') },
      { ...expectArticle('c') },
      { ...expectArticle('b') },
    ]);
  });

  test('Update + Deep sort (1st level) should ignore the sort', async () => {
    const articleToModify = article('a');

    const res = await rq.put(
      `/${schemas.contentTypes.article.pluralName}/${articleToModify.documentId}`,
      {
        body: { data: { primary: cat('d').id } },
        qs: {
          filter: { title: articleToModify.title },
          sort: 'categories.name',
          populate: 'categories',
        },
      }
    );

    expect(res.status).toBe(200);

    expect(res.body.data).toMatchObject({ ...expectArticle('a'), categories: [cat('b')] });
  });

  test('Delete + Deep sort (1st level) should ignore the sort', async () => {
    const articleToDelete = article('a');

    const res = await rq.delete(
      `/${schemas.contentTypes.article.pluralName}/${articleToDelete.documentId}`,
      {
        qs: {
          filter: { title: articleToDelete.title },
          sort: 'categories.name',
          populate: 'categories',
        },
      }
    );

    expect(res.status).toBe(204);
    expect(res.body.data).toBeUndefined();
  });
});
