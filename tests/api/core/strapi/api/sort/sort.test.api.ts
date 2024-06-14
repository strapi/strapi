'use strict';

import type { Core } from '@strapi/strapi';

import { createTestBuilder } from 'api-tests/builder';
import { createContentAPIRequest } from 'api-tests/request';
import { createStrapiInstance } from 'api-tests/strapi';

const builder = createTestBuilder();

let strapi: Core.Strapi;
let data;
let rq;

const cat = (letter) => {
  return data.category.find((c) => c.name.toLowerCase().endsWith(letter));
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
    const x = {
      D: ['A', 'D'], // 3
      A: ['B'], // 1
      B: ['C', 'D'], // 4
      C: ['D'], // 2
    };
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

  test('by an attribute in a relation (all pages)', async () => {
    const pageSize = 3;

    const page1 = await rq.get(`/${schemas.contentTypes.article.pluralName}`, {
      qs: {
        sort: 'categories.name',
        populate: 'categories',
        pagination: {
          pageSize,
          page: 1,
        },
      },
    });

    const page2 = await rq.get(`/${schemas.contentTypes.article.pluralName}`, {
      qs: {
        sort: 'categories.name',
        populate: 'categories',
        pagination: {
          pageSize,
          page: 2,
        },
      },
    });

    expect(page1.status).toBe(200);
    expect(page1.body.data.length).toBe(3);
    expect(page2.status).toBe(200);
    expect(page2.body.data.length).toBe(1);

    const basicFields = {
      documentId: expect.any(String),
      locale: 'en',
      publishedAt: expect.anything(),
      updatedAt: expect.anything(),
    };

    // TODO: some dbs might not return categories data sorted by id, this should be arrayContaining+objectMatching
    expect(page1.body.data).toMatchObject([
      {
        id: 3,
        ...basicFields,
        title: 'Article D',
        categories: [cat('a'), cat('d')],
      },
      {
        id: 1,
        ...basicFields,
        title: 'Article A',
        categories: [cat('b')],
      },
      {
        id: 4,
        ...basicFields,
        title: 'Article B',
        categories: [cat('c'), cat('d')],
      },
    ]);
    expect(page2.body.data).toMatchObject([
      {
        id: 2,
        ...basicFields,
        title: 'Article C',
        categories: [cat('d')],
      },
    ]);

    expect(page1.body.meta).toMatchObject({
      pagination: {
        page: 1,
        pageSize,
        pageCount: 2,
        total: 4,
      },
    });
    expect(page2.body.meta).toMatchObject({
      pagination: {
        page: 2,
        pageSize,
        pageCount: 2,
        total: 4,
      },
    });
  });

  test('by an attribute in a relation (all results in one page)', async () => {
    const page = 1;
    const pageSize = 100;

    const { status, body } = await rq.get(`/${schemas.contentTypes.article.pluralName}`, {
      qs: {
        sort: ['categories.name'],
        populate: 'categories',
        pagination: {
          page,
          pageSize,
        },
      },
    });

    expect(status).toBe(200);
    expect(body.data.length).toBe(4);

    const basicFields = {
      documentId: expect.any(String),
      publishedAt: expect.anything(),
      updatedAt: expect.anything(),
    };
    // TODO: some dbs might not return categories data sorted by id, this should be arrayContaining+objectMatching
    expect(body.data).toMatchObject([
      {
        id: 3,
        ...basicFields,
        title: 'Article D',
        categories: [cat('a'), cat('d')],
      },
      {
        id: 1,
        ...basicFields,
        title: 'Article A',
        categories: [cat('b')],
      },
      {
        id: 4,
        ...basicFields,
        title: 'Article B',
        categories: [cat('c'), cat('d')],
      },
      {
        id: 2,
        ...basicFields,
        title: 'Article C',
        categories: [cat('d')],
      },
    ]);

    expect(body.meta).toMatchObject({
      pagination: {
        page,
        pageSize,
        pageCount: 1,
        total: 4,
      },
    });
  });

  test.only('by a third level relation', async () => {
    const page = 1;
    const pageSize = 100;

    const { status, body } = await rq.get(`/${schemas.contentTypes.article.pluralName}`, {
      qs: {
        sort: ['categories.tags.name', 'categories.name'],
        populate: 'categories.tags',
        pagination: {
          page,
          pageSize,
        },
      },
    });

    expect(status).toBe(200);
    expect(body.data.length).toBe(4);

    const basicFields = {
      documentId: expect.any(String),
      publishedAt: expect.anything(),
      updatedAt: expect.anything(),
    };
    // TODO: some dbs might not return categories data sorted by id, this should be arrayContaining+objectMatching
    expect(body.data).toMatchObject([
      {
        id: 3,
        ...basicFields,
        title: 'Article D',
        categories: [cat('a'), cat('d')],
      },
      {
        id: 1,
        ...basicFields,
        title: 'Article A',
        categories: [cat('b')],
      },
      {
        id: 4,
        ...basicFields,
        title: 'Article B',
        categories: [cat('c'), cat('d')],
      },
      {
        id: 2,
        ...basicFields,
        title: 'Article C',
        categories: [cat('d')],
      },
    ]);

    expect(body.meta).toMatchObject({
      pagination: {
        page,
        pageSize,
        pageCount: 1,
        total: 4,
      },
    });
  });

  test.todo('Update + deep sort');

  test.todo('Delete + deep sort');

  test('Foo', async () => {
    const entry = await strapi.documents('api::article.article').findFirst({
      sort: 'categories.name:desc',
      populate: 'categories',
    });

    expect(entry).toMatchObject({
      id: 2,
      documentId: expect.any(String),
      publishedAt: expect.anything(),
      updatedAt: expect.anything(),
      title: 'Article C',
      categories: [cat('d')],
    });
  });
});
