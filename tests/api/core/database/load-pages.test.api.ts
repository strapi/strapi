import type { Core } from '@strapi/types';

import { createStrapiInstance } from 'api-tests/strapi';
import { createTestBuilder } from 'api-tests/builder';

const TAG_UID = 'api::load-pages-tag.load-pages-tag';
const ARTICLE_UID = 'api::load-pages-article.load-pages-article';

const tagModel = {
  kind: 'collectionType',
  displayName: 'load-pages-tag',
  singularName: 'load-pages-tag',
  pluralName: 'load-pages-tags',
  draftAndPublish: false,
  attributes: {
    name: { type: 'string' },
  },
};

const articleModel = {
  kind: 'collectionType',
  displayName: 'load-pages-article',
  singularName: 'load-pages-article',
  pluralName: 'load-pages-articles',
  draftAndPublish: false,
  attributes: {
    title: { type: 'string' },
    tags: {
      type: 'relation',
      relation: 'manyToMany',
      target: TAG_UID,
    },
  },
};

describe('Repository.loadPages', () => {
  const builder = createTestBuilder();
  let strapi: Core.Strapi;
  let article: { id: number };

  beforeAll(async () => {
    await builder.addContentTypes([tagModel, articleModel]).build();

    strapi = await createStrapiInstance();

    const tags = await Promise.all(
      ['a', 'b', 'c'].map((name) => strapi.db.query(TAG_UID).create({ data: { name } }))
    );

    article = await strapi.db.query(ARTICLE_UID).create({
      data: { title: 'article', tags: tags.map((tag) => tag.id) },
    });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('returns a page of the relation', async () => {
    const res = await strapi.db.query(ARTICLE_UID).loadPages(article, 'tags', {
      page: 1,
      pageSize: 2,
    });

    expect(res.results).toHaveLength(2);
    expect(res.pagination).toEqual({ page: 1, pageSize: 2, pageCount: 2, total: 3 });
  });

  test('ignores a count key in the params', async () => {
    // A params object that is reused from elsewhere can carry a count key
    const params = { page: 1, pageSize: 2, count: true };

    const res = await strapi.db.query(ARTICLE_UID).loadPages(article, 'tags', params);

    expect(Array.isArray(res.results)).toBe(true);
    expect(res.results).toHaveLength(2);
    expect(res.pagination).toEqual({ page: 1, pageSize: 2, pageCount: 2, total: 3 });
  });

  test('returns an empty page when the entity does not exist', async () => {
    const res = await strapi.db.query(ARTICLE_UID).loadPages({ id: 999999 }, 'tags', {
      page: 1,
      pageSize: 2,
    });

    expect(res).toEqual({
      results: [],
      pagination: { page: 1, pageSize: 2, pageCount: 0, total: 0 },
    });
  });
});
