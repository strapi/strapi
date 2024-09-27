'use strict';

const { isEmpty } = require('lodash/fp');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const form = require('api-tests/generators');
const { createAuthRequest } = require('api-tests/request');

const cleanDate = (entry) => {
  delete entry.updatedAt;
  delete entry.createdAt;
};

const builder = createTestBuilder();
let strapi;
let data;
let rq;

const getRelations = async (modelName, field, id) => {
  const res = await rq({
    method: 'GET',
    url: `/content-manager/relations/api::${modelName}.${modelName}/${id}/${field}`,
  });

  return res.body;
};

const deleteFixtures = async () => {
  for (const [name, modelName] of [
    ['references', 'reference'],
    ['tags', 'tag'],
    ['categories', 'category'],
    ['articles', 'article'],
    ['articlesWithTag', 'articlewithtag'],
  ]) {
    const uid = `api::${modelName}.${modelName}`;

    if (data[name] && data[name].length > 0) {
      await rq({
        method: 'POST',
        url: `/content-manager/collection-types/${uid}/actions/bulkDelete`,
        body: {
          ids: (data[name] || []).map(({ id }) => id),
        },
      });
    }
  }
};

describe('Relations', () => {
  beforeAll(async () => {
    await builder
      .addContentTypes(
        [form.article, form.tag, form.category, form.reference, form.articlewithtag],
        { batch: true }
      )
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Test manyToMany relation (article - tag) with Content Manager', () => {
    beforeAll(async () => {
      data = {
        articles: [],
        tags: [],
      };
    });

    afterAll(async () => {
      await deleteFixtures();
    });

    test('Create tag1', async () => {
      const { body } = await rq({
        url: '/content-manager/collection-types/api::tag.tag',
        method: 'POST',
        body: {
          name: 'tag1',
        },
      });

      data.tags.push(body.data);

      expect(body.data.documentId).toBeDefined();
      expect(body.data.name).toBe('tag1');
      expect(body.data.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.publishedAt).toBeDefined();
    });

    test('Create tag2', async () => {
      const { body } = await rq({
        url: '/content-manager/collection-types/api::tag.tag',
        method: 'POST',
        body: {
          name: 'tag2',
        },
      });

      data.tags.push(body.data);

      expect(body.data.documentId).toBeDefined();
      expect(body.data.name).toBe('tag2');
      expect(body.data.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.publishedAt).toBeDefined();
    });

    test('Create tag3', async () => {
      const { body } = await rq({
        url: '/content-manager/collection-types/api::tag.tag',
        method: 'POST',
        body: {
          name: 'tag3',
        },
      });

      data.tags.push(body.data);

      expect(body.data.documentId).toBeDefined();
      expect(body.data.name).toBe('tag3');
      expect(body.data.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.publishedAt).toBeDefined();
    });

    test('Create article1 without relation', async () => {
      const entry = {
        title: 'Article 1',
        content: 'My super content 1',
        date: '2019-08-13',
      };

      const { body } = await rq({
        url: '/content-manager/collection-types/api::article.article',
        method: 'POST',
        body: entry,
      });

      data.articles.push(body.data);

      expect(body.data.documentId).toBeDefined();
      expect(body.data.title).toBe(entry.title);
      expect(body.data.content).toBe(entry.content);
      expect(body.data.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.publishedAt).toBeDefined();

      const tags = (await getRelations('article', 'tags', body.data.documentId)).results;
      expect(tags.length).toBe(0);
    });

    test('Create article2 with tag1', async () => {
      const entry = {
        title: 'Article 2',
        content: 'Content 2',
        tags: [data.tags[0].documentId],
      };

      const { body } = await rq({
        url: '/content-manager/collection-types/api::article.article',
        method: 'POST',
        body: entry,
      });

      data.articles.push(body.data);

      expect(body.data.documentId).toBeDefined();
      expect(body.data.title).toBe(entry.title);
      expect(body.data.content).toBe(entry.content);
      expect(body.data.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.publishedAt).toBeDefined();

      const tags = (await getRelations('article', 'tags', body.data.documentId)).results;
      expect(tags.length).toBe(1);
      expect(tags[0].documentId).toBe(data.tags[0].documentId);
    });

    test('Update article1 add tag2', async () => {
      const entry = { ...data.articles[0], tags: [data.tags[1].documentId] };

      cleanDate(entry);

      const { body } = await rq({
        url: `/content-manager/collection-types/api::article.article/${entry.documentId}`,
        method: 'PUT',
        body: entry,
      });

      data.articles[0] = body.data;

      expect(body.data.documentId).toBeDefined();
      expect(body.data.title).toBe(entry.title);
      expect(body.data.content).toBe(entry.content);
      expect(body.data.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.publishedAt).toBeDefined();

      const tags = (await getRelations('article', 'tags', body.data.documentId)).results;
      expect(tags.length).toBe(1);
      expect(tags[0].documentId).toBe(data.tags[1].documentId);
    });

    test('Update article1 add tag1 and tag3', async () => {
      const { body } = await rq({
        url: `/content-manager/collection-types/api::article.article/${data.articles[0].documentId}`,
        method: 'PUT',
        body: {
          tags: [data.tags[0].documentId, data.tags[1].documentId, data.tags[2].documentId],
        },
      });

      expect(body.data.documentId).toBeDefined();
      expect(body.data.title).toBe(data.articles[0].title);
      expect(body.data.content).toBe(data.articles[0].content);
      expect(body.data.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.publishedAt).toBeDefined();

      const tags = (await getRelations('article', 'tags', body.data.documentId)).results;
      expect(tags.length).toBe(3);
    });

    test('Update article1 remove one tag', async () => {
      const { body } = await rq({
        url: `/content-manager/collection-types/api::article.article/${data.articles[0].documentId}`,
        method: 'PUT',
        body: {
          tags: [data.tags[1].documentId, data.tags[2].documentId],
        },
      });

      expect(body.data.documentId).toBeDefined();
      expect(body.data.title).toBe(data.articles[0].title);
      expect(body.data.content).toBe(data.articles[0].content);
      expect(body.data.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.publishedAt).toBeDefined();

      const tags = (await getRelations('article', 'tags', body.data.documentId)).results;
      expect(tags.length).toBe(2);
    });

    test('Update article1 remove all tag', async () => {
      const entry = { ...data.articles[0], tags: [] };

      cleanDate(entry);

      const { body } = await rq({
        url: `/content-manager/collection-types/api::article.article/${entry.documentId}`,
        method: 'PUT',
        body: entry,
      });

      data.articles[0] = body.data;

      expect(body.data.documentId).toBeDefined();
      expect(body.data.title).toBe(entry.title);
      expect(body.data.content).toBe(entry.content);
      expect(body.data.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.publishedAt).toBeDefined();

      const tags = (await getRelations('article', 'tags', body.data.documentId)).results;
      expect(tags.length).toBe(0);
    });

    test('Delete all articles should remove the association from all tags related to them', async () => {
      // Create a tag
      const {
        body: { data: createdTag },
      } = await rq({
        url: '/content-manager/collection-types/api::tag.tag',
        method: 'POST',
        body: {
          name: 'tag11',
        },
      });

      // Create the first article associated with the created tag
      const {
        body: { data: article12 },
      } = await rq({
        url: '/content-manager/collection-types/api::article.article',
        method: 'POST',
        body: {
          title: 'article12',
          content: 'Content',
          tags: [createdTag.documentId],
        },
      });

      // Retrieve the updated tag to ensure it has the association
      const {
        body: { data: updatedTag },
      } = await rq({
        url: `/content-manager/collection-types/api::tag.tag/${createdTag.documentId}`,
        method: 'GET',
      });

      // Create a second article associated with the same tag
      const {
        body: { data: article13 },
      } = await rq({
        url: '/content-manager/collection-types/api::article.article',
        method: 'POST',
        body: {
          title: 'article13',
          content: 'Content',
          tags: [updatedTag.documentId],
        },
      });

      // Retrieve the tag again to validate that it is associated with both articles
      const {
        body: { data: foundTag },
      } = await rq({
        url: `/content-manager/collection-types/api::tag.tag/${createdTag.documentId}`,
        method: 'GET',
      });

      // Assert that the tag is linked to both articles
      expect(foundTag.articles.count).toBe(2);

      // Bulk delete both articles using their document IDs
      const bulkDelete = await rq({
        url: '/content-manager/collection-types/api::article.article/actions/bulkDelete',
        method: 'POST',
        body: {
          documentIds: [article12.documentId, article13.documentId],
        },
      });

      expect(bulkDelete.status).toBe(200);

      // Retrieve the tag again to check that no articles are associated with it
      const {
        body: { data: foundTag2 },
      } = await rq({
        url: `/content-manager/collection-types/api::tag.tag/${createdTag.documentId}?populate=articles`,
        method: 'GET',
      });

      // Expect that the tag has no associated articles after the bulk delete
      expect(foundTag2.articles.count).toBe(0);
    });

    test('Bulk delete with some known and some unknown should delete and return SUCCESS', async () => {
      const {
        body: { data: article12 },
      } = await rq({
        url: '/content-manager/collection-types/api::article.article',
        method: 'POST',
        body: {
          title: 'article12',
          content: 'Content',
          tags: [],
        },
      });

      const bulkDelete = await rq({
        url: '/content-manager/collection-types/api::article.article/actions/bulkDelete',
        method: 'POST',
        body: {
          documentIds: [article12.documentId, 9999999],
        },
      });

      expect(bulkDelete.status).toBe(200);
      expect(bulkDelete.body.count).toBe(1);

      // article has been deleted
      const article = await rq({
        url: `/content-manager/collection-types/api::article.article/${article12.documentId}`,
        method: 'GET',
      });

      expect(article.status).toBe(404);
    });

    test('Bulk delete of entirely unknown entries should return a NOT FOUND', async () => {
      const bulkDelete = await rq({
        url: '/content-manager/collection-types/api::article.article/actions/bulkDelete',
        method: 'POST',
        body: {
          documentIds: [9999999],
        },
      });

      expect(bulkDelete.status).toBe(404);
    });
  });

  describe('Test manyWay articlesWithTags and tags', () => {
    beforeAll(() => {
      data = {
        tags: [],
        articlesWithTag: [],
      };
    });

    afterAll(async () => {
      await deleteFixtures();
    });

    test('Creating an article with some many way tags', async () => {
      const {
        body: { data: createdTag },
      } = await rq({
        url: '/content-manager/collection-types/api::tag.tag',
        method: 'POST',
        body: {
          name: 'tag11',
        },
      });

      data.tags.push(createdTag);

      const entry = {
        tags: [createdTag.documentId],
      };

      const { body } = await rq({
        url: '/content-manager/collection-types/api::articlewithtag.articlewithtag',
        method: 'POST',
        body: entry,
      });

      data.articlesWithTag.push(body.data);

      expect(body.data.documentId).toBeDefined();
      expect(body.data.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });

      const tags = (await getRelations('articlewithtag', 'tags', body.data.documentId)).results;
      expect(tags.length).toBe(1);
      expect(tags[0].documentId).toBe(data.tags[0].documentId);
    });
  });

  describe('Test oneToMany - manyToOne relation (article - category) with Content Manager', () => {
    beforeAll(() => {
      data = {
        articles: [],
        categories: [],
      };
    });

    afterAll(async () => {
      await deleteFixtures();
    });

    test('Create cat1', async () => {
      const { body } = await rq({
        url: '/content-manager/collection-types/api::category.category',
        method: 'POST',
        body: {
          name: 'cat1',
        },
      });

      data.categories.push(body.data);

      expect(body.data.documentId).toBeDefined();
      expect(body.data.name).toBe('cat1');
      expect(body.data.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.publishedAt).toBeDefined();

      const articles = (await getRelations('category', 'articles', body.data.documentId)).results;
      expect(articles.length).toBe(0);
    });

    test('Create cat2', async () => {
      const { body } = await rq({
        url: '/content-manager/collection-types/api::category.category',
        method: 'POST',
        body: {
          name: 'cat2',
        },
      });

      data.categories.push(body.data);

      expect(body.data.documentId).toBeDefined();
      expect(body.data.name).toBe('cat2');
      expect(body.data.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.publishedAt).toBeDefined();
      const articles = (await getRelations('category', 'articles', body.data.documentId)).results;
      expect(articles.length).toBe(0);
    });

    test('Create article1 with cat1', async () => {
      const entry = {
        title: 'Article 1',
        content: 'Content 1',
        category: data.categories[0].documentId,
      };

      const { body } = await rq({
        url: '/content-manager/collection-types/api::article.article',
        method: 'POST',
        body: entry,
      });

      data.articles.push(body.data);

      expect(body.data.documentId).toBeDefined();
      expect(body.data.title).toBe(entry.title);
      expect(body.data.content).toBe(entry.content);
      expect(body.data.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.publishedAt).toBeDefined();

      const tags = (await getRelations('article', 'tags', body.data.documentId)).results;
      expect(tags.length).toBe(0);

      const categories = (await getRelations('article', 'category', body.data.documentId)).results;
      expect(categories.length).toBe(1);
      expect(categories[0].name).toBe(data.categories[0].name);
    });

    test('Update article1 with cat2', async () => {
      const { body } = await rq({
        url: `/content-manager/collection-types/api::article.article/${data.articles[0].documentId}`,
        method: 'PUT',
        body: {
          category: data.categories[1].documentId,
        },
      });

      data.articles[0] = body.data;

      expect(body.data.documentId).toBeDefined();
      expect(body.data.title).toBe(data.articles[0].title);
      expect(body.data.content).toBe(data.articles[0].content);
      expect(body.data.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });

      const tags = (await getRelations('article', 'tags', body.data.documentId)).results;
      expect(tags.length).toBe(0);

      const categories = (await getRelations('article', 'category', body.data.documentId)).results;
      expect(categories.length).toBe(1);
      expect(categories[0].name).toBe(data.categories[1].name);
    });

    test('Create article2', async () => {
      const entry = {
        title: 'Article 2',
        content: 'Content 2',
      };

      const { body } = await rq({
        url: '/content-manager/collection-types/api::article.article',
        method: 'POST',
        body: entry,
      });

      data.articles.push(body.data);

      expect(body.data.documentId).toBeDefined();
      expect(body.data.title).toBe(entry.title);
      expect(body.data.content).toBe(entry.content);
      expect(body.data.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });

      const tags = (await getRelations('article', 'tags', body.data.documentId)).results;
      expect(tags.length).toBe(0);
    });

    test('Update article2 with cat2', async () => {
      const { body } = await rq({
        url: `/content-manager/collection-types/api::article.article/${data.articles[1].documentId}`,
        method: 'PUT',
        body: {
          category: data.categories[1].documentId,
        },
      });

      data.articles[1] = body.data;

      expect(body.data.documentId).toBeDefined();
      expect(body.data.title).toBe(data.articles[1].title);
      expect(body.data.content).toBe(data.articles[1].content);
      expect(body.data.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });

      const tags = (await getRelations('article', 'tags', body.data.documentId)).results;
      expect(tags.length).toBe(0);

      const categories = (await getRelations('article', 'category', body.data.documentId)).results;
      expect(categories.length).toBe(1);
      expect(categories[0].name).toBe(data.categories[1].name);
    });

    test('Update cat1 with article1', async () => {
      const { body } = await rq({
        url: `/content-manager/collection-types/api::category.category/${data.categories[0].documentId}`,
        method: 'PUT',
        body: {
          articles: [data.articles[0].documentId],
        },
      });

      data.categories[0] = body.data;

      expect(body.data.documentId).toBeDefined();
      expect(body.data.name).toBe(data.categories[0].name);
      expect(body.data.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });

      const articles = (await getRelations('category', 'articles', body.data.documentId)).results;
      expect(articles.length).toBe(1);
    });

    test('Create cat3 with article1', async () => {
      const entry = {
        name: 'cat3',
        articles: [data.articles[0].documentId],
      };

      const { body } = await rq({
        url: '/content-manager/collection-types/api::category.category',
        method: 'POST',
        body: entry,
      });

      data.categories.push(body.data);

      expect(body.data.documentId).toBeDefined();
      expect(body.data.name).toBe(entry.name);
      expect(body.data.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });

      const articles = (await getRelations('category', 'articles', body.data.documentId)).results;
      expect(articles.length).toBe(1);
    });

    test('Get article1 with cat3', async () => {
      const { body } = await rq({
        url: `/content-manager/relations/api::article.article/${data.articles[0].documentId}/category`,
        method: 'GET',
      });

      expect(body).toMatchObject({ results: [{ name: 'cat3' }] });
    });

    test('Get article2 with cat2', async () => {
      const { body } = await rq({
        url: `/content-manager/relations/api::article.article/${data.articles[1].documentId}/category`,
        method: 'GET',
      });

      expect(body).toMatchObject({ results: [{ name: 'cat2' }] });
    });

    test('Get cat1 without relations', async () => {
      const { body } = await rq({
        url: `/content-manager/relations/api::category.category/${data.categories[0].documentId}/articles`,
        method: 'GET',
      });

      expect(body).toMatchObject({
        results: [],
        pagination: {
          total: 0,
          pageSize: 10,
          page: 1,
          pageCount: 0,
        },
      });
    });

    test('Get cat2 with article2', async () => {
      const { body } = await rq({
        url: `/content-manager/relations/api::category.category/${data.categories[1].documentId}/articles`,
        method: 'GET',
      });

      expect(body).toMatchObject({
        pagination: { page: 1, pageCount: 1, pageSize: 10, total: 1 },
        results: [{ title: 'Article 2' }],
      });
    });

    test('Get cat3 with article1', async () => {
      const { body } = await rq({
        url: `/content-manager/relations/api::category.category/${data.categories[2].documentId}/articles`,
        method: 'GET',
      });

      expect(body).toMatchObject({
        pagination: { page: 1, pageCount: 1, pageSize: 10, total: 1 },
        results: [{ title: 'Article 1' }],
      });
    });
  });

  describe('Test oneToOne relation (article - reference) with Content Manager', () => {
    beforeAll(() => {
      data = {
        articles: [],
        references: [],
      };
    });

    afterAll(async () => {
      await deleteFixtures();
    });

    test('Create ref1', async () => {
      const { body } = await rq({
        url: '/content-manager/collection-types/api::reference.reference',
        method: 'POST',
        body: {
          name: 'ref1',
        },
      });

      data.references.push(body.data);

      expect(body.data.documentId).toBeDefined();
      expect(body.data.name).toBe('ref1');
      expect(body.data.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });
    });

    test('Create article1', async () => {
      const entry = {
        title: 'Article 1',
        content: 'Content 1',
      };

      const { body } = await rq({
        url: '/content-manager/collection-types/api::article.article',
        method: 'POST',
        body: entry,
      });

      data.articles.push(body.data);

      expect(body.data.documentId).toBeDefined();
      expect(body.data.title).toBe(entry.title);
      expect(body.data.content).toBe(entry.content);
      expect(body.data.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.publishedAt).toBeDefined();
    });

    test('Update article1 with ref1', async () => {
      const { body } = await rq({
        url: `/content-manager/collection-types/api::article.article/${data.articles[0].documentId}`,
        method: 'PUT',
        body: {
          reference: data.references[0].documentId,
        },
      });

      data.articles[0] = body.data;

      expect(body.data.documentId).toBeDefined();
      expect(body.data.title).toBe(data.articles[0].title);
      expect(body.data.content).toBe(data.articles[0].content);
      expect(body.data.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });

      const references = await getRelations('article', 'reference', body.data.documentId);
      expect(references.results[0].documentId).toBe(data.references[0].documentId);
    });

    test('Create article2 with ref1', async () => {
      const entry = {
        title: 'Article 2',
        content: 'Content 2',
        reference: data.references[0].documentId,
      };

      const { body } = await rq({
        url: '/content-manager/collection-types/api::article.article',
        method: 'POST',
        body: entry,
      });

      data.articles.push(body.data);

      expect(body.data.documentId).toBeDefined();
      expect(body.data.title).toBe(entry.title);
      expect(body.data.content).toBe(entry.content);
      expect(body.data.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.data.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });
      const references = await getRelations('article', 'reference', body.data.documentId);
      expect(references.results[0].documentId).toBe(data.references[0].documentId);
    });
  });

  describe('Test oneWay relation (reference - tag) with Content Manager', () => {
    test('Attach Tag to a Reference', async () => {
      const {
        body: { data: createdTag },
      } = await rq({
        url: '/content-manager/collection-types/api::tag.tag',
        method: 'POST',
        body: {
          name: 'tag111',
        },
      });

      const {
        body: { data: createdReference },
      } = await rq({
        url: '/content-manager/collection-types/api::reference.reference',
        method: 'POST',
        body: {
          name: 'cat111',
          tag: createdTag.documentId,
        },
      });

      expect(createdReference.documentId).toBeDefined();

      const tags = await getRelations('reference', 'tag', createdReference.documentId);
      expect(tags.results[0].documentId).toBe(createdTag.documentId);
    });

    test('Detach Tag to a Reference', async () => {
      const {
        body: { data: createdTag },
      } = await rq({
        url: '/content-manager/collection-types/api::tag.tag',
        method: 'POST',
        body: {
          name: 'tag111',
        },
      });

      const {
        body: { data: createdReference },
      } = await rq({
        url: '/content-manager/collection-types/api::reference.reference',
        method: 'POST',
        body: {
          name: 'cat111',
          tag: createdTag.documentId,
        },
      });

      let tags = await getRelations('reference', 'tag', createdReference.documentId);
      expect(tags.results[0].documentId).toBe(createdTag.documentId);

      const {
        body: { data: referenceToUpdate },
      } = await rq({
        url: `/content-manager/collection-types/api::reference.reference/${createdReference.documentId}`,
        method: 'PUT',
        body: {
          tag: null,
        },
      });

      tags = await getRelations('reference', 'tag', referenceToUpdate.documentId);
      expect(isEmpty(tags.results)).toBe(true);
    });

    test('Delete Tag so the relation in the Reference side should be removed', async () => {
      const {
        body: { data: createdTag },
      } = await rq({
        url: '/content-manager/collection-types/api::tag.tag',
        method: 'POST',
        body: {
          name: 'tag111',
        },
      });

      const {
        body: { data: createdReference },
      } = await rq({
        url: '/content-manager/collection-types/api::reference.reference',
        method: 'POST',
        body: {
          name: 'cat111',
          tag: createdTag.documentId,
        },
      });

      await rq({
        url: `/content-manager/collection-types/api::tag.tag/${createdTag.documentId}`,
        method: 'DELETE',
      });

      const {
        body: { data: foundReference },
      } = await rq({
        url: `/content-manager/collection-types/api::reference.reference/${createdReference.documentId}`,
        method: 'GET',
      });

      expect(foundReference.tag.count).toBe(0);
    });
  });
});
