'use strict';

// Helpers.
const { createStrapiInstance } = require('api-tests/strapi');
const { createContentAPIRequest } = require('api-tests/request');
const { createTestBuilder } = require('api-tests/builder');
const modelsUtils = require('api-tests/models');

const form = require('api-tests/generators');

const cleanDate = (entry) => {
  delete entry.updatedAt;
  delete entry.createdAt;
};

const builder = createTestBuilder();
let data;
let rq;
let strapi;

describe('Create Strapi API End to End', () => {
  beforeAll(async () => {
    await builder
      .addContentTypes([form.article, form.tag, form.category, form.reference, form.product], {
        batch: true,
      })
      .build();

    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });
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

    test('Create tag1', async () => {
      const { body } = await rq({
        url: '/tags',
        method: 'POST',
        body: {
          data: {
            name: 'tag1',
          },
        },
      });

      data.tags.push(body.data);

      expect(body.data.documentId).toBeDefined();
      expect(body.data.name).toBe('tag1');
    });

    test('Create tag2', async () => {
      const { body } = await rq({
        url: '/tags',
        method: 'POST',
        body: {
          data: {
            name: 'tag2',
          },
        },
      });

      data.tags.push(body.data);

      expect(body.data.documentId).toBeDefined();
      expect(body.data.name).toBe('tag2');
    });

    test('Create tag3', async () => {
      const { body } = await rq({
        url: '/tags',
        method: 'POST',
        body: {
          data: {
            name: 'tag3',
          },
        },
      });

      data.tags.push(body.data);

      expect(body.data.documentId).toBeDefined();
      expect(body.data.name).toBe('tag3');
    });

    test('Create article1 without relation', async () => {
      const entry = {
        title: 'Article 1',
        content: 'My super content 1',
      };

      const { body } = await rq({
        url: '/articles',
        method: 'POST',
        body: {
          data: entry,
        },
      });

      data.articles.push(body.data);

      expect(body.data.documentId).toBeDefined();
      expect(body.data.title).toBe(entry.title);
      expect(body.data.content).toBe(entry.content);
    });

    test('Create article2 with tag1', async () => {
      const entry = {
        title: 'Article 2',
        content: 'Content 2',
        tags: [data.tags[0].documentId],
      };

      const { body } = await rq({
        url: '/articles',
        method: 'POST',
        body: {
          data: entry,
        },
        qs: {
          populate: ['tags'],
        },
      });

      data.articles.push(body.data);

      expect(body.data.documentId).toBeDefined();
      expect(body.data.title).toBe(entry.title);
      expect(body.data.content).toBe(entry.content);
      expect(Array.isArray(body.data.tags)).toBeTruthy();
      expect(body.data.tags.length).toBe(1);
      expect(body.data.tags[0].documentId).toBe(data.tags[0].documentId);
    });

    test('Create article with non existent tag', async () => {
      const entry = {
        title: 'Article 3',
        content: 'Content 3',
        tags: [1000],
      };

      const res = await rq({
        url: '/articles',
        method: 'POST',
        body: {
          data: entry,
        },
        qs: {
          populate: ['tags'],
        },
      });

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.error.text).error.message).toContain(
        `1 relation(s) of type api::tag.tag associated with this entity do not exist`
      );
    });

    test('Update article1 add tag2', async () => {
      const { id, documentId, ...attributes } = data.articles[0];
      const entry = { ...attributes, tags: [data.tags[1].documentId] };

      cleanDate(entry);

      const { body } = await rq({
        url: `/articles/${documentId}`,
        method: 'PUT',
        body: {
          data: entry,
        },
        qs: {
          populate: ['tags'],
        },
      });

      data.articles[0] = body.data;

      expect(body.data.documentId).toBeDefined();
      expect(body.data.title).toBe(entry.title);
      expect(body.data.content).toBe(entry.content);
      expect(Array.isArray(body.data.tags)).toBeTruthy();
      expect(body.data.tags.length).toBe(1);
      expect(body.data.tags[0].documentId).toBe(data.tags[1].documentId);
    });

    test('Update article1 add tag1 and tag3', async () => {
      const { id, documentId, ...attributes } = data.articles[0];
      const entry = { ...attributes };
      entry.tags = data.tags.map((t) => t.documentId);

      cleanDate(entry);

      const { body } = await rq({
        url: `/articles/${documentId}`,
        method: 'PUT',
        body: {
          data: entry,
        },
        qs: {
          populate: ['tags'],
        },
      });

      data.articles[0] = body.data;

      expect(body.data.documentId).toBeDefined();
      expect(body.data.title).toBe(entry.title);
      expect(body.data.content).toBe(entry.content);
      expect(Array.isArray(body.data.tags)).toBeTruthy();
      expect(body.data.tags.length).toBe(3);
    });

    test('Error when updating article1 with some non existent tags', async () => {
      const { id, documentId, ...entry } = data.articles[0];
      entry.tags = [1000, 1001, 1002, ...data.tags.slice(-1).map((t) => t.documentId)];

      cleanDate(entry);

      const res = await rq({
        url: `/articles/${documentId}`,
        method: 'PUT',
        body: {
          data: entry,
        },
        qs: {
          populate: ['tags'],
        },
      });

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.error.text).error.message).toContain(
        `3 relation(s) of type api::tag.tag associated with this entity do not exist`
      );
    });

    test('Update article1 remove one tag', async () => {
      const { id, documentId, ...entry } = data.articles[0];

      entry.tags = entry.tags.slice(1).map((t) => t.documentId);

      cleanDate(entry);

      const { body } = await rq({
        url: `/articles/${documentId}`,
        method: 'PUT',
        body: {
          data: entry,
        },
        qs: {
          populate: ['tags'],
        },
      });

      data.articles[0] = body.data;

      expect(body.data.documentId).toBeDefined();
      expect(body.data.title).toBe(entry.title);
      expect(body.data.content).toBe(entry.content);
      expect(Array.isArray(body.data.tags)).toBeTruthy();
      expect(body.data.tags.length).toBe(2);
    });

    test('Update article1 remove all tag', async () => {
      const { id, documentId, ...attributes } = data.articles[0];
      const entry = { ...attributes, tags: [] };

      cleanDate(entry);

      const { body } = await rq({
        url: `/articles/${documentId}`,
        method: 'PUT',
        body: {
          data: entry,
        },
        qs: {
          populate: ['tags'],
        },
      });

      data.articles[0] = body.data;

      expect(body.data.documentId).toBeDefined();
      expect(body.data.title).toBe(entry.title);
      expect(body.data.content).toBe(entry.content);
      expect(Array.isArray(body.data.tags)).toBeTruthy();
      expect(body.data.tags.length).toBe(0);
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
      await modelsUtils.cleanupModels([form.article.uid, form.category.uid], { strapi });
    });

    test('Create cat1', async () => {
      const { body } = await rq({
        url: '/categories',
        method: 'POST',
        body: {
          data: {
            name: 'cat1',
          },
        },
        qs: {
          populate: ['articles'],
        },
      });

      data.categories.push(body.data);

      expect(body.data.documentId).toBeDefined();
      expect(body.data.name).toBe('cat1');
    });

    test('Create cat2', async () => {
      const { body } = await rq({
        url: '/categories',
        method: 'POST',
        body: {
          data: {
            name: 'cat2',
          },
        },
        qs: {
          populate: ['articles'],
        },
      });

      data.categories.push(body.data);

      expect(body.data.documentId).toBeDefined();
      expect(body.data.name).toBe('cat2');
    });

    test('Create article1 with cat1', async () => {
      const entry = {
        title: 'Article 1',
        content: 'Content 1',
        category: data.categories[0].documentId,
      };

      const { body } = await rq({
        url: '/articles',
        method: 'POST',
        body: {
          data: entry,
        },
        qs: {
          populate: ['category'],
        },
      });

      data.articles.push(body.data);

      expect(body.data.documentId).toBeDefined();
      expect(body.data.title).toBe(entry.title);
      expect(body.data.content).toBe(entry.content);
      expect(body.data.category.name).toBe(data.categories[0].name);
    });

    test('Update article1 with cat2', async () => {
      const { id, documentId, ...attributes } = data.articles[0];
      const entry = { ...attributes, category: data.categories[1].documentId };

      cleanDate(entry);

      const { body } = await rq({
        url: `/articles/${documentId}`,
        method: 'PUT',
        body: {
          data: entry,
        },
        qs: {
          populate: ['category'],
        },
      });

      data.articles[0] = body.data;

      expect(body.data.documentId).toBeDefined();
      expect(body.data.title).toBe(entry.title);
      expect(body.data.content).toBe(entry.content);
      expect(body.data.category.name).toBe(data.categories[1].name);
    });

    test('Create article2', async () => {
      const entry = {
        title: 'Article 2',
        content: 'Content 2',
      };

      const { body } = await rq({
        url: '/articles',
        method: 'POST',
        body: {
          data: entry,
        },
      });

      data.articles.push(body.data);

      expect(body.data.documentId).toBeDefined();
      expect(body.data.title).toBe(entry.title);
      expect(body.data.content).toBe(entry.content);
    });

    test('Update article2 with cat2', async () => {
      const { id, documentId, ...attributes } = data.articles[1];

      const entry = { ...attributes, category: data.categories[1].documentId };

      cleanDate(entry);

      const { body } = await rq({
        url: `/articles/${documentId}`,
        method: 'PUT',
        body: {
          data: entry,
        },
        qs: {
          populate: ['category'],
        },
      });

      data.articles[1] = body.data;

      expect(body.data.documentId).toBeDefined();
      expect(body.data.title).toBe(entry.title);
      expect(body.data.content).toBe(entry.content);
      expect(body.data.category.name).toBe(data.categories[1].name);
    });

    test('Update cat1 with article1', async () => {
      const { id, documentId, ...entry } = data.categories[0];

      entry.articles = data.categories[0].articles
        .map((a) => a.documentId)
        .concat(data.articles[0].documentId);

      cleanDate(entry);

      const { body } = await rq({
        url: `/categories/${documentId}`,
        method: 'PUT',
        body: {
          data: entry,
        },
        qs: {
          populate: ['articles'],
        },
      });

      data.categories[0] = body.data;

      expect(body.data.documentId).toBeDefined();
      expect(Array.isArray(body.data.articles)).toBeTruthy();
      expect(body.data.articles.length).toBe(1);
      expect(body.data.name).toBe(entry.name);
    });

    test('Create cat3 with article1', async () => {
      const entry = {
        name: 'cat3',
        articles: [data.articles[0].documentId],
      };

      const { body } = await rq({
        url: '/categories',
        method: 'POST',
        body: {
          data: entry,
        },
        qs: {
          populate: ['articles'],
        },
      });

      data.categories.push(body.data);

      expect(body.data.documentId).toBeDefined();
      expect(Array.isArray(body.data.articles)).toBeTruthy();
      expect(body.data.articles.length).toBe(1);
      expect(body.data.name).toBe(entry.name);
    });

    test('Get article1 with cat3', async () => {
      const { body } = await rq({
        url: `/articles/${data.articles[0].documentId}`,
        method: 'GET',
        qs: {
          populate: ['category'],
        },
      });

      expect(body.data.documentId).toBeDefined();
      expect(body.data.category.documentId).toBe(data.categories[2].documentId);
    });

    test('Get article2 with cat2', async () => {
      const { body } = await rq({
        url: `/articles/${data.articles[1].documentId}`,
        method: 'GET',
        qs: {
          populate: ['category'],
        },
      });

      expect(body.data.documentId).toBeDefined();
      expect(body.data.category.documentId).toBe(data.categories[1].documentId);
    });

    test('Get cat1 without relations', async () => {
      const { body } = await rq({
        url: `/categories/${data.categories[0].documentId}`,
        method: 'GET',
        qs: {
          populate: ['articles'],
        },
      });

      expect(body.data.documentId).toBeDefined();
      expect(body.data.articles.length).toBe(0);
    });

    test('Get cat2 with article2', async () => {
      const { body } = await rq({
        url: `/categories/${data.categories[1].documentId}`,
        method: 'GET',
        qs: {
          populate: ['articles'],
        },
      });

      expect(body.data.documentId).toBeDefined();
      expect(body.data.articles.length).toBe(1);
      expect(body.data.articles[0].documentId).toBe(data.articles[1].documentId);
    });

    test('Get cat3 with article1', async () => {
      const { body } = await rq({
        url: `/categories/${data.categories[2].documentId}`,
        method: 'GET',
        qs: {
          populate: ['articles'],
        },
      });

      expect(body.data.documentId).toBeDefined();
      expect(body.data.articles.length).toBe(1);
      expect(body.data.articles[0].documentId).toBe(data.articles[0].documentId);
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
      await modelsUtils.cleanupModels([form.article.uid, form.reference.uid], { strapi });
    });

    test('Create ref1', async () => {
      const { body } = await rq({
        url: '/references',
        method: 'POST',
        body: {
          data: {
            name: 'ref1',
          },
        },
      });

      data.references.push(body.data);

      expect(body.data.documentId).toBeDefined();
      expect(body.data.name).toBe('ref1');
    });

    test('Create article1', async () => {
      const entry = {
        title: 'Article 1',
        content: 'Content 1',
      };

      const { body } = await rq({
        url: '/articles',
        method: 'POST',
        body: {
          data: entry,
        },
      });

      data.articles.push(body.data);

      expect(body.data.id).toBeDefined();
      expect(body.data.title).toBe(entry.title);
      expect(body.data.content).toBe(entry.content);
    });

    test('Update article1 with ref1', async () => {
      const { id, documentId, ...attributes } = data.articles[0];
      const entry = { ...attributes, reference: data.references[0].documentId };

      cleanDate(entry);

      const { body } = await rq({
        url: `/articles/${documentId}`,
        method: 'PUT',
        body: {
          data: entry,
        },
        qs: {
          populate: ['reference'],
        },
      });

      data.articles[0] = body.data;

      expect(body.data.documentId).toBeDefined();
      expect(body.data.title).toBe(entry.title);
      expect(body.data.content).toBe(entry.content);
      expect(body.data.reference.documentId).toBe(entry.reference);
    });

    test('Create article2 with ref1', async () => {
      const entry = {
        title: 'Article 2',
        content: 'Content 2',
        reference: data.references[0].documentId,
      };

      const { body } = await rq({
        url: '/articles',
        method: 'POST',
        body: {
          data: entry,
        },
        qs: {
          populate: ['reference'],
        },
      });

      data.articles.push(body.data);

      expect(body.data.documentId).toBeDefined();
      expect(body.data.title).toBe(entry.title);
      expect(body.data.content).toBe(entry.content);
      expect(body.data.reference.documentId).toBe(entry.reference);
    });
  });

  describe('Test oneWay relation (reference - tag) with Content Manager', () => {
    beforeAll(() => {
      data = {
        tags: [],
        references: [],
      };
    });

    afterAll(async () => {
      await modelsUtils.cleanupModels([form.reference.uid, form.tag.uid], { strapi });
    });

    test('Attach Tag to a Reference', async () => {
      const {
        body: { data: createdTag },
      } = await rq({
        url: '/tags',
        method: 'POST',
        body: {
          data: {
            name: 'tag111',
          },
        },
      });

      data.tags.push(createdTag);

      const {
        body: { data: createdReference },
      } = await rq({
        url: '/references',
        method: 'POST',
        body: {
          data: {
            name: 'cat111',
            tag: createdTag.documentId,
          },
        },
        qs: {
          populate: ['tag'],
        },
      });

      data.references.push(createdReference);
      expect(createdReference.tag.documentId).toBe(createdTag.documentId);
    });

    test('Detach Tag from a Reference', async () => {
      const {
        body: { data: createdTag },
      } = await rq({
        url: '/tags',
        method: 'POST',
        body: {
          data: {
            name: 'tag111',
          },
        },
      });

      data.tags.push(createdTag);

      const {
        body: { data: createdReference },
      } = await rq({
        url: '/references',
        method: 'POST',
        body: {
          data: {
            name: 'cat111',
            tag: createdTag.documentId,
          },
        },
        qs: {
          populate: ['tag'],
        },
      });

      data.references.push(createdReference);

      expect(createdReference.tag.documentId).toBe(createdTag.documentId);

      const {
        body: { data: updatedReference },
      } = await rq({
        url: `/references/${createdReference.documentId}`,
        method: 'PUT',
        body: {
          data: {
            tag: null,
          },
        },
        qs: {
          populate: ['tag'],
        },
      });

      expect(updatedReference.tag).toBe(null);
    });

    test('Delete Tag so the relation in the Reference side should be removed', async () => {
      const {
        body: { data: createdTag },
      } = await rq({
        url: '/tags',
        method: 'POST',
        body: {
          data: {
            name: 'tag111',
          },
        },
      });

      data.tags.push(createdTag);

      const {
        body: { data: createdReference },
      } = await rq({
        url: '/references',
        method: 'POST',
        body: {
          data: {
            name: 'cat111',
            tag: createdTag.documentId,
          },
        },
        qs: {
          populate: ['tag'],
        },
      });

      data.references.push(createdReference);

      await rq({
        url: `/tags/${createdTag.documentId}`,
        method: 'DELETE',
      });

      const {
        body: { data: foundReference },
      } = await rq({
        url: `/references/${createdReference.documentId}`,
        method: 'GET',
        qs: {
          populate: ['tag'],
        },
      });

      expect(foundReference.tag).toBe(null);
    });
  });
});
