'use strict';

// Test for FK Filter Optimization - verifies the fix works for ANY relation field and ANY parameter
const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');

const builder = createTestBuilder();
let strapi;

// Setup multiple content types with different relation fields to prove it's not hardcoded
const categoryCT = {
  displayName: 'category',
  singularName: 'category',
  pluralName: 'categories',
  kind: 'collectionType',
  attributes: {
    name: { type: 'string' },
    status: { type: 'string' },
  },
};

const authorCT = {
  displayName: 'author',
  singularName: 'author',
  pluralName: 'authors',
  kind: 'collectionType',
  attributes: {
    name: { type: 'string' },
    country: { type: 'string' },
  },
};

const publisherCT = {
  displayName: 'publisher',
  singularName: 'publisher',
  pluralName: 'publishers',
  kind: 'collectionType',
  attributes: {
    name: { type: 'string' },
  },
};

const articleCT = {
  displayName: 'article',
  singularName: 'article',
  pluralName: 'articles',
  kind: 'collectionType',
  attributes: {
    title: { type: 'string' },
    views: { type: 'integer' },
    rating: { type: 'decimal' },
    status: { type: 'string' },
    // Multiple different relation fields - proves it's not hardcoded
    category: {
      type: 'relation',
      relation: 'manyToOne',
      target: 'api::category.category',
    },
    author: {
      type: 'relation',
      relation: 'manyToOne',
      target: 'api::author.author',
    },
    publisher: {
      type: 'relation',
      relation: 'manyToOne',
      target: 'api::publisher.publisher',
    },
  },
};

const fixtures = {
  category: [
    { name: 'Tech', status: 'active' },
    { name: 'Science', status: 'active' },
    { name: 'Sports', status: 'inactive' },
  ],
  author: [
    { name: 'John Doe', country: 'USA' },
    { name: 'Jane Smith', country: 'UK' },
    { name: 'Bob Johnson', country: 'Canada' },
  ],
  publisher: [{ name: 'Publisher A' }, { name: 'Publisher B' }],
  article: ({ category, author, publisher }) => {
    return [
      // Articles for category 1 (Tech)
      {
        title: 'Article 1',
        views: 100,
        rating: 4.5,
        status: 'published',
        category: category[0].id,
        author: author[0].id,
        publisher: publisher[0].id,
      },
      {
        title: 'Article 2',
        views: 200,
        rating: 4.5,
        status: 'published',
        category: category[0].id,
        author: author[0].id,
        publisher: publisher[0].id,
      },
      {
        title: 'Article 3',
        views: 300,
        rating: 4.8,
        status: 'published',
        category: category[0].id,
        author: author[1].id,
        publisher: publisher[0].id,
      },
      {
        title: 'Article 4',
        views: 400,
        rating: 4.2,
        status: 'published',
        category: category[0].id,
        author: author[1].id,
        publisher: publisher[1].id,
      },
      {
        title: 'Article 5',
        views: 500,
        rating: 4.5,
        status: 'draft',
        category: category[0].id,
        author: author[2].id,
        publisher: publisher[0].id,
      },

      // Articles for category 2 (Science)
      {
        title: 'Article 6',
        views: 600,
        rating: 4.9,
        status: 'published',
        category: category[1].id,
        author: author[0].id,
        publisher: publisher[0].id,
      },
      {
        title: 'Article 7',
        views: 700,
        rating: 4.7,
        status: 'published',
        category: category[1].id,
        author: author[1].id,
        publisher: publisher[1].id,
      },

      // Articles for category 3 (Sports)
      {
        title: 'Article 8',
        views: 800,
        rating: 4.3,
        status: 'published',
        category: category[2].id,
        author: author[2].id,
        publisher: publisher[0].id,
      },
    ];
  },
};

describe('FK Filter Optimization - Works for ANY field and ANY parameter', () => {
  beforeAll(async () => {
    await builder
      .addContentTypes([categoryCT, authorCT, publisherCT, articleCT])
      .addFixtures(categoryCT.singularName, fixtures.category)
      .addFixtures(authorCT.singularName, fixtures.author)
      .addFixtures(publisherCT.singularName, fixtures.publisher)
      .addFixtures(articleCT.singularName, fixtures.article)
      .build();

    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Different relation fields (not hardcoded)', () => {
    test('Works with category relation field + select', async () => {
      const categories = await strapi.db.query('api::category.category').findMany();
      const techCategoryId = categories[0].id;

      const results = await strapi.db.query('api::article.article').findMany({
        where: {
          category: { id: techCategoryId },
          status: 'published',
        },
        select: ['title', 'views'],
      });

      expect(results.length).toBe(4); // 4 published articles in Tech category
    });

    test('Works with author relation field + select', async () => {
      const authors = await strapi.db.query('api::author.author').findMany();
      const johnDoeId = authors[0].id;

      const results = await strapi.db.query('api::article.article').findMany({
        where: {
          author: { id: johnDoeId },
          status: 'published',
        },
        select: ['rating'],
      });

      expect(results.length).toBe(2); // 2 published articles by John Doe
    });

    test('Works with publisher relation field + select', async () => {
      const publishers = await strapi.db.query('api::publisher.publisher').findMany();
      const publisherAId = publishers[0].id;

      const results = await strapi.db.query('api::article.article').findMany({
        where: {
          publisher: { id: publisherAId },
        },
        select: ['views'],
      });

      expect(results.length).toBe(6); // 6 articles from Publisher A
    });
  });

  describe('Different operators (not hardcoded)', () => {
    test('Works with $in operator', async () => {
      const categories = await strapi.db.query('api::category.category').findMany();
      const categoryIds = [categories[0].id, categories[1].id];

      const results = await strapi.db.query('api::article.article').findMany({
        where: {
          category: { id: { $in: categoryIds } },
          status: 'published',
        },
        select: ['title'],
      });

      expect(results.length).toBe(6); // 4 from Tech + 2 from Science
    });

    test('Works with $ne operator', async () => {
      const categories = await strapi.db.query('api::category.category').findMany();
      const sportsCategoryId = categories[2].id;

      const results = await strapi.db.query('api::article.article').findMany({
        where: {
          category: { id: { $ne: sportsCategoryId } },
        },
        select: ['title'],
      });

      expect(results.length).toBe(7); // All except Sports category
    });

    test('Works with $notIn operator', async () => {
      const authors = await strapi.db.query('api::author.author').findMany();
      const excludeIds = [authors[2].id];

      const results = await strapi.db.query('api::article.article').findMany({
        where: {
          author: { id: { $notIn: excludeIds } },
        },
        select: ['views'],
      });

      expect(results.length).toBe(6); // All except Bob Johnson's articles
    });
  });

  describe('Different select fields (not hardcoded)', () => {
    test('Works with single field select', async () => {
      const categories = await strapi.db.query('api::category.category').findMany();
      const techCategoryId = categories[0].id;

      const results = await strapi.db.query('api::article.article').findMany({
        where: { category: { id: techCategoryId } },
        select: ['title'],
      });

      expect(results.length).toBe(5);
      expect(results[0]).toHaveProperty('title');
      expect(results[0]).not.toHaveProperty('views');
    });

    test('Works with multiple fields select', async () => {
      const categories = await strapi.db.query('api::category.category').findMany();
      const techCategoryId = categories[0].id;

      const results = await strapi.db.query('api::article.article').findMany({
        where: { category: { id: techCategoryId } },
        select: ['title', 'views', 'rating'],
      });

      expect(results.length).toBe(5);
      expect(results[0]).toHaveProperty('title');
      expect(results[0]).toHaveProperty('views');
      expect(results[0]).toHaveProperty('rating');
    });
  });

  describe('Multiple relation filters (not hardcoded)', () => {
    test('Works with multiple relation filters in same query', async () => {
      const categories = await strapi.db.query('api::category.category').findMany();
      const authors = await strapi.db.query('api::author.author').findMany();
      const publishers = await strapi.db.query('api::publisher.publisher').findMany();

      const results = await strapi.db.query('api::article.article').findMany({
        where: {
          category: { id: categories[0].id },
          author: { id: authors[0].id },
          publisher: { id: publishers[0].id },
        },
        select: ['title'],
      });

      expect(results.length).toBe(2); // Articles matching all three criteria
    });
  });

  describe('Complex filters still use JOIN (fallback)', () => {
    test('Complex filter with non-id field still works', async () => {
      const results = await strapi.db.query('api::article.article').findMany({
        where: {
          category: { name: 'Tech' }, // Complex filter - should use JOIN
        },
        select: ['title'],
      });

      expect(results.length).toBe(5);
    });

    test('Complex filter with multiple fields still works', async () => {
      const results = await strapi.db.query('api::article.article').findMany({
        where: {
          category: { name: 'Tech', status: 'active' }, // Complex filter - should use JOIN
        },
        select: ['title'],
      });

      expect(results.length).toBe(5);
    });
  });
});
