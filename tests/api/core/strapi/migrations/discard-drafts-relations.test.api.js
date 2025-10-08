/**
 * Test for the discard-drafts migration with actual relations
 *
 * This test verifies that the migration correctly copies relations
 * when creating draft entries from published entries.
 */

'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const modelsUtils = require('api-tests/models');

// Import the migration directly
const {
  discardDocumentDrafts,
} = require('../../../../../packages/core/core/src/migrations/database/5.0.0-discard-drafts');

let builder;
let strapi;
let rq;

// Content types without relations first
const authorModel = {
  kind: 'collectionType',
  collectionName: 'authors',
  singularName: 'author',
  pluralName: 'authors',
  displayName: 'Author',
  draftAndPublish: false,
  pluginOptions: {
    i18n: { localized: true },
  },
  attributes: {
    name: {
      type: 'string',
      pluginOptions: { i18n: { localized: true } },
    },
    bio: {
      type: 'text',
      pluginOptions: { i18n: { localized: true } },
    },
  },
};

const categoryModel = {
  kind: 'collectionType',
  collectionName: 'categories',
  singularName: 'category',
  pluralName: 'categories',
  displayName: 'Category',
  draftAndPublish: false,
  pluginOptions: {
    i18n: { localized: true },
  },
  attributes: {
    name: {
      type: 'string',
      pluginOptions: { i18n: { localized: true } },
    },
    description: {
      type: 'text',
      pluginOptions: { i18n: { localized: true } },
    },
  },
};

const imageModel = {
  kind: 'collectionType',
  collectionName: 'images',
  singularName: 'image',
  pluralName: 'images',
  displayName: 'Image',
  draftAndPublish: false,
  pluginOptions: {
    i18n: { localized: true },
  },
  attributes: {
    name: {
      type: 'string',
      pluginOptions: { i18n: { localized: true } },
    },
    url: {
      type: 'string',
      pluginOptions: { i18n: { localized: true } },
    },
  },
};

const articleModel = {
  kind: 'collectionType',
  collectionName: 'articles',
  singularName: 'article',
  pluralName: 'articles',
  displayName: 'Article',
  draftAndPublish: false,
  pluginOptions: {
    i18n: { localized: true },
  },
  attributes: {
    title: {
      type: 'string',
      pluginOptions: { i18n: { localized: true } },
    },
    content: {
      type: 'text',
      pluginOptions: { i18n: { localized: true } },
    },
  },
};

// Test data
const testData = {
  authors: [
    {
      documentId: 'auth1',
      name: 'John Doe',
      bio: 'Senior developer and AI researcher',
      locale: 'en',
      publishedAt: new Date(),
    },
    {
      documentId: 'auth2',
      name: 'Jane Smith',
      bio: 'Quantum computing expert',
      locale: 'en',
      publishedAt: new Date(),
    },
  ],
  categories: [
    {
      documentId: 'cat1',
      name: 'Technology',
      description: 'Latest tech trends and innovations',
      locale: 'en',
      publishedAt: new Date(),
    },
    {
      documentId: 'cat2',
      name: 'Science',
      description: 'Scientific discoveries and research',
      locale: 'en',
      publishedAt: new Date(),
    },
  ],
  images: [
    {
      documentId: 'img1',
      name: 'AI Brain Image',
      url: 'https://example.com/ai-brain.jpg',
      locale: 'en',
      publishedAt: new Date(),
    },
    {
      documentId: 'img2',
      name: 'Quantum Circuit',
      url: 'https://example.com/quantum-circuit.jpg',
      locale: 'en',
      publishedAt: new Date(),
    },
  ],
  articles: [
    {
      documentId: 'art1',
      title: 'AI Revolution',
      content: 'The future of AI and its impact on society...',
      locale: 'en',
      publishedAt: new Date(),
    },
    {
      documentId: 'art2',
      title: 'Quantum Computing',
      content: 'Understanding quantum computing principles...',
      locale: 'en',
      publishedAt: new Date(),
    },
  ],
};

const restart = async () => {
  await strapi.destroy();
  strapi = await createStrapiInstance();
  rq = await createAuthRequest({ strapi });
};

async function addInitialData() {
  // Create initial data without publishedAt (v4 state)
  const authors = [];
  for (const data of testData.authors) {
    const { publishedAt, ...authorData } = data;
    const author = await strapi.documents('api::author.author').create({ data: authorData });
    authors.push(author);
  }

  const categories = [];
  for (const data of testData.categories) {
    const { publishedAt, ...categoryData } = data;
    const category = await strapi
      .documents('api::category.category')
      .create({ data: categoryData });
    categories.push(category);
  }

  const images = [];
  for (const data of testData.images) {
    const { publishedAt, ...imageData } = data;
    const image = await strapi.documents('api::image.image').create({ data: imageData });
    images.push(image);
  }

  const articles = [];
  for (const data of testData.articles) {
    const { publishedAt, ...articleData } = data;
    const article = await strapi.documents('api::article.article').create({ data: articleData });
    articles.push(article);
  }
}

async function setPublishedAtValues() {
  // Set publishedAt values to simulate v4 state where all entries were "published"
  // In v4, there was no draft/published concept, so all entries had publishedAt set
  const publishedAt = new Date();

  // First, delete any draft entries that were created by the content type migration
  // We only want the original entries from v4, which should all be "published"
  await strapi.db.query('api::author.author').deleteMany({
    where: { publishedAt: null },
  });

  await strapi.db.query('api::category.category').deleteMany({
    where: { publishedAt: null },
  });

  await strapi.db.query('api::image.image').deleteMany({
    where: { publishedAt: null },
  });

  await strapi.db.query('api::article.article').deleteMany({
    where: { publishedAt: null },
  });

  // Now set publishedAt on all remaining entries to simulate v4 state
  await strapi.db.query('api::author.author').updateMany({
    where: {},
    data: { publishedAt },
  });

  await strapi.db.query('api::category.category').updateMany({
    where: {},
    data: { publishedAt },
  });

  await strapi.db.query('api::image.image').updateMany({
    where: {},
    data: { publishedAt },
  });

  await strapi.db.query('api::article.article').updateMany({
    where: {},
    data: { publishedAt },
  });
}

describe('Discard Drafts Migration - Relations Test', () => {
  beforeAll(async () => {
    builder = createTestBuilder();

    await builder
      .addContentType(authorModel)
      .addContentType(categoryModel)
      .addContentType(imageModel)
      .addContentType(articleModel)
      .addFixtures('plugin::i18n.locale', [{ name: 'en', code: 'en' }])
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    // Add initial data without publishedAt (v4 state)
    await addInitialData();
  }, 120000); // Increase timeout to 2 minutes

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Migration execution with relations', () => {
    test('should copy relations correctly when creating draft entries', async () => {
      // Step 1: Add relations to content types after they're created
      await addRelationsToContentTypes();

      // Step 2: Set up actual relations between the data
      await setupRelations();

      // Step 3: Verify initial state with relations
      const articlesWithRelations = await strapi.db.query('api::article.article').findMany({
        populate: ['author', 'categories', 'featuredImage'],
      });

      expect(articlesWithRelations).toHaveLength(2);

      // Verify that articles have relations set up
      const article1 = articlesWithRelations.find((a) => a.documentId === 'art1');
      const article2 = articlesWithRelations.find((a) => a.documentId === 'art2');

      expect(article1.author).toBeDefined();
      expect(article1.categories).toHaveLength(2);
      expect(article1.featuredImage).toBeDefined();

      expect(article2.author).toBeDefined();
      expect(article2.categories).toHaveLength(1);
      expect(article2.featuredImage).toBeDefined();

      // Step 4: Enable D&P on content types (this creates the table structure for D&P)
      await enableDraftAndPublish('author');
      await enableDraftAndPublish('category');
      await enableDraftAndPublish('image');
      await enableDraftAndPublish('article');

      // Step 5: Restart to apply D&P schema changes
      await restart();

      // Step 6: Set publishedAt values to simulate v4 state
      await setPublishedAtValues();

      // Step 7: Run the database migration directly
      await strapi.db.transaction(async ({ trx }) => {
        await discardDocumentDrafts.up(trx, strapi.db);
      });

      // Step 8: Verify that relations are copied correctly
      const finalArticles = await strapi.db.query('api::article.article').findMany({
        populate: ['author', 'categories', 'featuredImage'],
      });

      // Should have doubled the entries (published + draft)
      expect(finalArticles).toHaveLength(4); // 2 published + 2 draft

      const publishedArticles = finalArticles.filter((a) => a.publishedAt !== null);
      const draftArticles = finalArticles.filter((a) => a.publishedAt === null);

      expect(publishedArticles).toHaveLength(2);
      expect(draftArticles).toHaveLength(2);

      // Step 9: Verify that draft articles have the same relations as published articles
      for (const draft of draftArticles) {
        const published = publishedArticles.find(
          (p) => p.documentId === draft.documentId && p.locale === draft.locale
        );

        expect(published).toBeDefined();

        // Verify author relation
        if (published.author) {
          expect(draft.author).toBeDefined();
          expect(draft.author.documentId).toBe(published.author.documentId);
          expect(draft.author.name).toBe(published.author.name);
        }

        // Verify categories relation
        if (published.categories && published.categories.length > 0) {
          expect(draft.categories).toBeDefined();
          expect(draft.categories).toHaveLength(published.categories.length);

          // Verify category documentIds match
          const draftCategoryIds = draft.categories.map((c) => c.documentId).sort();
          const publishedCategoryIds = published.categories.map((c) => c.documentId).sort();
          expect(draftCategoryIds).toEqual(publishedCategoryIds);
        }

        // Verify featuredImage relation
        if (published.featuredImage) {
          expect(draft.featuredImage).toBeDefined();
          expect(draft.featuredImage.documentId).toBe(published.featuredImage.documentId);
          expect(draft.featuredImage.name).toBe(published.featuredImage.name);
        }
      }

      // TODO: Verify self-referencing relations on authors once test setup properly enables D&P for all content types
    });
  });

  // Helper functions
  async function addRelationsToContentTypes() {
    // Add relations to authors (self-referencing)
    const authorSchema = await modelsUtils.getContentTypeSchema('author', { strapi });
    await modelsUtils.modifyContentType(
      {
        ...authorSchema,
        attributes: {
          ...authorSchema.attributes,
          mentor: {
            type: 'relation',
            relation: 'manyToOne',
            target: 'api::author.author',
            inversedBy: 'mentees',
          },
          mentees: {
            type: 'relation',
            relation: 'oneToMany',
            target: 'api::author.author',
            mappedBy: 'mentor',
          },
          articles: {
            type: 'relation',
            relation: 'oneToMany',
            target: 'api::article.article',
            mappedBy: 'author',
          },
        },
      },
      { strapi }
    );

    // Add relations to categories (self-referencing many-to-many)
    const categorySchema = await modelsUtils.getContentTypeSchema('category', { strapi });
    await modelsUtils.modifyContentType(
      {
        ...categorySchema,
        attributes: {
          ...categorySchema.attributes,
          parentCategories: {
            type: 'relation',
            relation: 'manyToMany',
            target: 'api::category.category',
            inversedBy: 'childCategories',
          },
          childCategories: {
            type: 'relation',
            relation: 'manyToMany',
            target: 'api::category.category',
            mappedBy: 'parentCategories',
          },
        },
      },
      { strapi }
    );

    // Add relations to images
    const imageSchema = await modelsUtils.getContentTypeSchema('image', { strapi });
    await modelsUtils.modifyContentType(
      {
        ...imageSchema,
        attributes: {
          ...imageSchema.attributes,
          articles: {
            type: 'relation',
            relation: 'oneToMany',
            target: 'api::article.article',
            mappedBy: 'featuredImage',
          },
        },
      },
      { strapi }
    );

    // Add relations to articles
    const articleSchema = await modelsUtils.getContentTypeSchema('article', { strapi });
    await modelsUtils.modifyContentType(
      {
        ...articleSchema,
        attributes: {
          ...articleSchema.attributes,
          author: {
            type: 'relation',
            relation: 'manyToOne',
            target: 'api::author.author',
            inversedBy: 'articles',
          },
          categories: {
            type: 'relation',
            relation: 'manyToMany',
            target: 'api::category.category',
          },
          featuredImage: {
            type: 'relation',
            relation: 'oneToOne',
            target: 'api::image.image',
          },
        },
      },
      { strapi }
    );

    // Restart to apply schema changes
    await restart();
  }

  async function setupRelations() {
    // Get the entries after schema changes
    const authors = await strapi.db.query('api::author.author').findMany();
    const categories = await strapi.db.query('api::category.category').findMany();
    const images = await strapi.db.query('api::image.image').findMany();
    const articles = await strapi.db.query('api::article.article').findMany();

    const johnDoe = authors.find((a) => a.documentId === 'auth1' && a.locale === 'en');
    const janeSmith = authors.find((a) => a.documentId === 'auth2' && a.locale === 'en');
    const tech = categories.find((c) => c.documentId === 'cat1' && c.locale === 'en');
    const science = categories.find((c) => c.documentId === 'cat2' && c.locale === 'en');
    const aiImage = images.find((i) => i.documentId === 'img1' && i.locale === 'en');
    const quantumImage = images.find((i) => i.documentId === 'img2' && i.locale === 'en');
    const aiArticle = articles.find((a) => a.documentId === 'art1' && a.locale === 'en');
    const quantumArticle = articles.find((a) => a.documentId === 'art2' && a.locale === 'en');

    // Set up author mentor relationship
    if (johnDoe && janeSmith) {
      await strapi.documents('api::author.author').update({
        documentId: 'auth2',
        locale: 'en',
        data: { mentor: johnDoe.id },
      });
    }

    // Set up category parent-child relationship
    if (tech && science) {
      await strapi.documents('api::category.category').update({
        documentId: 'cat2',
        locale: 'en',
        data: { parentCategories: [tech.id] },
      });
    }

    // Set up article relations
    if (aiArticle && johnDoe && tech && science && aiImage) {
      await strapi.documents('api::article.article').update({
        documentId: 'art1',
        locale: 'en',
        data: {
          author: johnDoe.id,
          categories: [tech.id, science.id],
          featuredImage: aiImage.id,
        },
      });
    }

    if (quantumArticle && janeSmith && science && quantumImage) {
      await strapi.documents('api::article.article').update({
        documentId: 'art2',
        locale: 'en',
        data: {
          author: janeSmith.id,
          categories: [science.id],
          featuredImage: quantumImage.id,
        },
      });
    }
  }

  async function enableDraftAndPublish(contentTypeName) {
    const schema = await modelsUtils.getContentTypeSchema(contentTypeName, { strapi });

    await modelsUtils.modifyContentType(
      {
        ...schema,
        draftAndPublish: true,
      },
      { strapi }
    );
  }
});
