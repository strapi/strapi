'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');

const builder = createTestBuilder();
let strapi;

const ARTICLE_UID = 'api::article.article';
const CATEGORY_UID = 'api::category.category';

const categoryCT = {
  displayName: 'category',
  singularName: 'category',
  pluralName: 'categories',
  kind: 'collectionType',
  options: { draftAndPublish: false },
  attributes: {
    name: { type: 'string' },
  },
};

const articleCT = {
  displayName: 'article',
  singularName: 'article',
  pluralName: 'articles',
  kind: 'collectionType',
  options: { draftAndPublish: false },
  attributes: {
    title: { type: 'string' },
    views: { type: 'integer' },
    likes: { type: 'integer' },
    viewCount: { type: 'integer' },
    category: {
      type: 'relation',
      relation: 'manyToOne',
      target: CATEGORY_UID,
    },
  },
};

const inCategoryA = { category: { name: 'A' } };

const readArticles = () =>
  strapi.db.query(ARTICLE_UID).findMany({
    select: ['title', 'views', 'likes'],
    orderBy: { title: 'asc' },
  });

describe('relation-filtered query builder writes', () => {
  beforeAll(async () => {
    await builder.addContentTypes([categoryCT, articleCT]).build();

    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  beforeEach(async () => {
    await strapi.db.query(ARTICLE_UID).deleteMany({});
    await strapi.db.query(CATEGORY_UID).deleteMany({});

    const a = await strapi.db.query(CATEGORY_UID).create({ data: { name: 'A' } });
    const b = await strapi.db.query(CATEGORY_UID).create({ data: { name: 'B' } });

    for (const [title, category] of [
      ['a1', a.id],
      ['a2', a.id],
      ['b1', b.id],
    ]) {
      await strapi.db
        .query(ARTICLE_UID)
        .create({ data: { title, views: 10, likes: 10, viewCount: 0, category } });
    }
  });

  test('increment and decrement only the matching rows', async () => {
    await strapi.db
      .queryBuilder(ARTICLE_UID)
      .where(inCategoryA)
      .increment('views', 2)
      .decrement('likes', 3)
      .execute();

    expect(await readArticles()).toEqual([
      { title: 'a1', views: 12, likes: 7 },
      { title: 'a2', views: 12, likes: 7 },
      { title: 'b1', views: 10, likes: 10 },
    ]);
  });

  test('sums counters on the same column', async () => {
    await strapi.db
      .queryBuilder(ARTICLE_UID)
      .where(inCategoryA)
      .increment('views', 2)
      .decrement('views', 1)
      .execute();

    expect((await readArticles()).map((row) => row.views)).toEqual([11, 11, 10]);
  });

  test('maps attribute names to column names for counters', async () => {
    await strapi.db
      .queryBuilder(ARTICLE_UID)
      .where(inCategoryA)
      .increment('viewCount', 4)
      .decrement('viewCount', 1)
      .execute();

    const rows = await strapi.db
      .query(ARTICLE_UID)
      .findMany({ select: ['title', 'viewCount'], orderBy: { title: 'asc' } });

    expect(rows.map((row) => row.viewCount)).toEqual([3, 3, 0]);
  });

  test('ignores forUpdate and orderBy in the relation subquery', async () => {
    await strapi.db.transaction(async () => {
      await strapi.db
        .queryBuilder(ARTICLE_UID)
        .init({ where: inCategoryA, orderBy: { title: 'desc' } })
        .forUpdate()
        .increment('views', 1)
        .execute();
    });

    expect((await readArticles()).map((row) => row.views)).toEqual([11, 11, 10]);
  });

  test.each([
    ['title desc', { title: 'desc' }, [10, 11, 10]],
    ['title asc', { title: 'asc' }, [11, 10, 10]],
    ['id desc', { id: 'desc' }, [10, 11, 10]],
  ])('first() ordered by %s writes only the row it picks', async (_label, orderBy, views) => {
    await strapi.db
      .queryBuilder(ARTICLE_UID)
      .init({ where: inCategoryA, orderBy })
      .first()
      .increment('views', 1)
      .execute();

    expect((await readArticles()).map((row) => row.views)).toEqual(views);
  });

  test.each([
    ['limit 1', { limit: 1 }, [10, 11, 10]],
    ['offset 1, limit 1', { offset: 1, limit: 1 }, [11, 10, 10]],
  ])('title desc with %s writes only the rows it picks', async (_label, page, views) => {
    await strapi.db
      .queryBuilder(ARTICLE_UID)
      .init({ where: inCategoryA, orderBy: { title: 'desc' }, ...page })
      .increment('views', 1)
      .execute();

    expect((await readArticles()).map((row) => row.views)).toEqual(views);
  });

  test.each([
    ['first()', (qb) => qb.first(), [10, 10, 11]],
    ['limit 1', (qb) => qb.limit(1), [10, 10, 11]],
    ['offset 1', (qb) => qb.offset(1), [11, 11, 10]],
  ])('category name desc with %s writes only the rows it picks', async (_label, page, views) => {
    const qb = strapi.db.queryBuilder(ARTICLE_UID).init({
      where: { category: { name: { $in: ['A', 'B'] } } },
      orderBy: { category: { name: 'desc' } },
    });

    await page(qb).increment('views', 1).execute();

    expect((await readArticles()).map((row) => row.views)).toEqual(views);
  });

  test.each([
    ['increment', (qb) => qb.increment('views', 5)],
    ['update', (qb) => qb.update({ title: 'changed' })],
    ['delete', (qb) => qb.delete()],
  ])('%s rolls back with an explicit transaction', async (_label, apply) => {
    const trx = await strapi.db.connection.transaction();

    try {
      await apply(strapi.db.queryBuilder(ARTICLE_UID).where(inCategoryA))
        .transacting(trx)
        .execute();
    } finally {
      await trx.rollback();
    }

    expect(await readArticles()).toEqual([
      { title: 'a1', views: 10, likes: 10 },
      { title: 'a2', views: 10, likes: 10 },
      { title: 'b1', views: 10, likes: 10 },
    ]);
  });
});
