'use strict';

// Helpers.
const { createStrapiInstance } = require('../../../../test/helpers/strapi');
const { createContentAPIRequest } = require('../../../../test/helpers/request');
const { createTestBuilder } = require('../../../../test/helpers/builder');
const modelsUtils = require('../../../../test/helpers/models');

const form = require('../../../../test/helpers/generators');

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

      expect(body.data.id).toBeDefined();
      expect(body.data.attributes.name).toBe('tag1');
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

      expect(body.data.id).toBeDefined();
      expect(body.data.attributes.name).toBe('tag2');
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

      expect(body.data.id).toBeDefined();
      expect(body.data.attributes.name).toBe('tag3');
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

      expect(body.data.id).toBeDefined();
      expect(body.data.attributes.title).toBe(entry.title);
      expect(body.data.attributes.content).toBe(entry.content);
    });

    test('Create article2 with tag1', async () => {
      const entry = {
        title: 'Article 2',
        content: 'Content 2',
        tags: [data.tags[0].id],
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

      expect(body.data.id).toBeDefined();
      expect(body.data.attributes.title).toBe(entry.title);
      expect(body.data.attributes.content).toBe(entry.content);
      expect(Array.isArray(body.data.attributes.tags.data)).toBeTruthy();
      expect(body.data.attributes.tags.data.length).toBe(1);
      expect(body.data.attributes.tags.data[0].id).toBe(data.tags[0].id);
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
      const { id, attributes } = data.articles[0];
      const entry = { ...attributes, tags: [data.tags[1].id] };

      cleanDate(entry);

      const { body } = await rq({
        url: `/articles/${id}`,
        method: 'PUT',
        body: {
          data: entry,
        },
        qs: {
          populate: ['tags'],
        },
      });

      data.articles[0] = body.data;

      expect(body.data.id).toBeDefined();
      expect(body.data.attributes.title).toBe(entry.title);
      expect(body.data.attributes.content).toBe(entry.content);
      expect(Array.isArray(body.data.attributes.tags.data)).toBeTruthy();
      expect(body.data.attributes.tags.data.length).toBe(1);
      expect(body.data.attributes.tags.data[0].id).toBe(data.tags[1].id);
    });

    test('Update article1 add tag1 and tag3', async () => {
      const { id, attributes } = data.articles[0];
      const entry = { ...attributes };
      entry.tags = data.tags.map((t) => t.id);

      cleanDate(entry);

      const { body } = await rq({
        url: `/articles/${id}`,
        method: 'PUT',
        body: {
          data: entry,
        },
        qs: {
          populate: ['tags'],
        },
      });

      data.articles[0] = body.data;

      expect(body.data.id).toBeDefined();
      expect(body.data.attributes.title).toBe(entry.title);
      expect(body.data.attributes.content).toBe(entry.content);
      expect(Array.isArray(body.data.attributes.tags.data)).toBeTruthy();
      expect(body.data.attributes.tags.data.length).toBe(3);
    });

    test('Update article1 adding a non existent tag', async () => {
      const { id, attributes } = data.articles[0];
      const entry = { ...attributes };
      entry.tags = [1000, 1001, 1002];

      cleanDate(entry);

      const res = await rq({
        url: `/articles/${id}`,
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
      const { id, attributes } = data.articles[0];

      const entry = { ...attributes };
      entry.tags = entry.tags.data.slice(1).map((t) => t.id);

      cleanDate(entry);

      const { body } = await rq({
        url: `/articles/${id}`,
        method: 'PUT',
        body: {
          data: entry,
        },
        qs: {
          populate: ['tags'],
        },
      });

      data.articles[0] = body.data;

      expect(body.data.id).toBeDefined();
      expect(body.data.attributes.title).toBe(entry.title);
      expect(body.data.attributes.content).toBe(entry.content);
      expect(Array.isArray(body.data.attributes.tags.data)).toBeTruthy();
      expect(body.data.attributes.tags.data.length).toBe(2);
    });

    test('Update article1 remove all tag', async () => {
      const { id, attributes } = data.articles[0];
      const entry = { ...attributes, tags: [] };

      cleanDate(entry);

      const { body } = await rq({
        url: `/articles/${id}`,
        method: 'PUT',
        body: {
          data: entry,
        },
        qs: {
          populate: ['tags'],
        },
      });

      data.articles[0] = body.data;

      expect(body.data.id).toBeDefined();
      expect(body.data.attributes.title).toBe(entry.title);
      expect(body.data.attributes.content).toBe(entry.content);
      expect(Array.isArray(body.data.attributes.tags.data)).toBeTruthy();
      expect(body.data.attributes.tags.data.length).toBe(0);
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

      expect(body.data.id).toBeDefined();
      expect(body.data.attributes.name).toBe('cat1');
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

      expect(body.data.id).toBeDefined();
      expect(body.data.attributes.name).toBe('cat2');
    });

    test('Create article1 with cat1', async () => {
      const entry = {
        title: 'Article 1',
        content: 'Content 1',
        category: data.categories[0].id,
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

      expect(body.data.id).toBeDefined();
      expect(body.data.attributes.title).toBe(entry.title);
      expect(body.data.attributes.content).toBe(entry.content);
      expect(body.data.attributes.category.data.attributes.name).toBe(
        data.categories[0].attributes.name
      );
    });

    test('Update article1 with cat2', async () => {
      const { id, attributes } = data.articles[0];
      const entry = { ...attributes, category: data.categories[1].id };

      cleanDate(entry);

      const { body } = await rq({
        url: `/articles/${id}`,
        method: 'PUT',
        body: {
          data: entry,
        },
        qs: {
          populate: ['category'],
        },
      });

      data.articles[0] = body.data;

      expect(body.data.id).toBeDefined();
      expect(body.data.attributes.title).toBe(entry.title);
      expect(body.data.attributes.content).toBe(entry.content);
      expect(body.data.attributes.category.data.attributes.name).toBe(
        data.categories[1].attributes.name
      );
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

      expect(body.data.id).toBeDefined();
      expect(body.data.attributes.title).toBe(entry.title);
      expect(body.data.attributes.content).toBe(entry.content);
    });

    test('Update article2 with cat2', async () => {
      const { id, attributes } = data.articles[1];

      const entry = { ...attributes, category: data.categories[1].id };

      cleanDate(entry);

      const { body } = await rq({
        url: `/articles/${id}`,
        method: 'PUT',
        body: {
          data: entry,
        },
        qs: {
          populate: ['category'],
        },
      });

      data.articles[1] = body.data;

      expect(body.data.id).toBeDefined();
      expect(body.data.attributes.title).toBe(entry.title);
      expect(body.data.attributes.content).toBe(entry.content);
      expect(body.data.attributes.category.data.attributes.name).toBe(
        data.categories[1].attributes.name
      );
    });

    test('Update cat1 with article1', async () => {
      const { id, attributes } = data.categories[0];

      const entry = { ...attributes };
      entry.articles = data.categories[0].attributes.articles.data
        .map((a) => a.id)
        .concat(data.articles[0].id);

      cleanDate(entry);

      const { body } = await rq({
        url: `/categories/${id}`,
        method: 'PUT',
        body: {
          data: entry,
        },
        qs: {
          populate: ['articles'],
        },
      });

      data.categories[0] = body.data;

      expect(body.data.id).toBeDefined();
      expect(Array.isArray(body.data.attributes.articles.data)).toBeTruthy();
      expect(body.data.attributes.articles.data.length).toBe(1);
      expect(body.data.attributes.name).toBe(entry.name);
    });

    test('Create cat3 with article1', async () => {
      const entry = {
        name: 'cat3',
        articles: [data.articles[0].id],
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

      expect(body.data.id).toBeDefined();
      expect(Array.isArray(body.data.attributes.articles.data)).toBeTruthy();
      expect(body.data.attributes.articles.data.length).toBe(1);
      expect(body.data.attributes.name).toBe(entry.name);
    });

    test('Get article1 with cat3', async () => {
      const { body } = await rq({
        url: `/articles/${data.articles[0].id}`,
        method: 'GET',
        qs: {
          populate: ['category'],
        },
      });

      expect(body.data.id).toBeDefined();
      expect(body.data.attributes.category.data.id).toBe(data.categories[2].id);
    });

    test('Get article2 with cat2', async () => {
      const { body } = await rq({
        url: `/articles/${data.articles[1].id}`,
        method: 'GET',
        qs: {
          populate: ['category'],
        },
      });

      expect(body.data.id).toBeDefined();
      expect(body.data.attributes.category.data.id).toBe(data.categories[1].id);
    });

    test('Get cat1 without relations', async () => {
      const { body } = await rq({
        url: `/categories/${data.categories[0].id}`,
        method: 'GET',
        qs: {
          populate: ['articles'],
        },
      });

      expect(body.data.id).toBeDefined();
      expect(body.data.attributes.articles.data.length).toBe(0);
    });

    test('Get cat2 with article2', async () => {
      const { body } = await rq({
        url: `/categories/${data.categories[1].id}`,
        method: 'GET',
        qs: {
          populate: ['articles'],
        },
      });

      expect(body.data.id).toBeDefined();
      expect(body.data.attributes.articles.data.length).toBe(1);
      expect(body.data.attributes.articles.data[0].id).toBe(data.articles[1].id);
    });

    test('Get cat3 with article1', async () => {
      const { body } = await rq({
        url: `/categories/${data.categories[2].id}`,
        method: 'GET',
        qs: {
          populate: ['articles'],
        },
      });

      expect(body.data.id).toBeDefined();
      expect(body.data.attributes.articles.data.length).toBe(1);
      expect(body.data.attributes.articles.data[0].id).toBe(data.articles[0].id);
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

      expect(body.data.id).toBeDefined();
      expect(body.data.attributes.name).toBe('ref1');
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
      expect(body.data.attributes.title).toBe(entry.title);
      expect(body.data.attributes.content).toBe(entry.content);
    });

    test('Update article1 with ref1', async () => {
      const { id, attributes } = data.articles[0];
      const entry = { ...attributes, reference: data.references[0].id };

      cleanDate(entry);

      const { body } = await rq({
        url: `/articles/${id}`,
        method: 'PUT',
        body: {
          data: entry,
        },
        qs: {
          populate: ['reference'],
        },
      });

      data.articles[0] = body.data;

      expect(body.data.id).toBeDefined();
      expect(body.data.attributes.title).toBe(entry.title);
      expect(body.data.attributes.content).toBe(entry.content);
      expect(body.data.attributes.reference.data.id).toBe(entry.reference);
    });

    test('Create article2 with ref1', async () => {
      const entry = {
        title: 'Article 2',
        content: 'Content 2',
        reference: data.references[0].id,
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

      expect(body.data.id).toBeDefined();
      expect(body.data.attributes.title).toBe(entry.title);
      expect(body.data.attributes.content).toBe(entry.content);
      expect(body.data.attributes.reference.data.id).toBe(entry.reference);
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
            tag: createdTag.id,
          },
        },
        qs: {
          populate: ['tag'],
        },
      });

      data.references.push(createdReference);
      expect(createdReference.attributes.tag.data.id).toBe(createdTag.id);
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
            tag: createdTag.id,
          },
        },
        qs: {
          populate: ['tag'],
        },
      });

      data.references.push(createdReference);

      expect(createdReference.attributes.tag.data.id).toBe(createdTag.id);

      const {
        body: { data: updatedReference },
      } = await rq({
        url: `/references/${createdReference.id}`,
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

      expect(updatedReference.attributes.tag.data).toBe(null);
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
            tag: createdTag.id,
          },
        },
        qs: {
          populate: ['tag'],
        },
      });

      data.references.push(createdReference);

      await rq({
        url: `/tags/${createdTag.id}`,
        method: 'DELETE',
      });

      const {
        body: { data: foundReference },
      } = await rq({
        url: `/references/${createdReference.id}`,
        method: 'GET',
        qs: {
          populate: ['tag'],
        },
      });

      expect(foundReference.attributes.tag.data).toBe(null);
    });
  });
});
