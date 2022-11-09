'use strict';

const { isEmpty } = require('lodash/fp');

const { createTestBuilder } = require('../../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../../test/helpers/strapi');
const form = require('../../../../../test/helpers/generators');
const { createAuthRequest } = require('../../../../../test/helpers/request');

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

      data.tags.push(body);

      expect(body.id).toBeDefined();
      expect(body.name).toBe('tag1');
      expect(body.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.publishedAt).toBeUndefined();
    });

    test('Create tag2', async () => {
      const { body } = await rq({
        url: '/content-manager/collection-types/api::tag.tag',
        method: 'POST',
        body: {
          name: 'tag2',
        },
      });

      data.tags.push(body);

      expect(body.id).toBeDefined();
      expect(body.name).toBe('tag2');
      expect(body.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.publishedAt).toBeUndefined();
    });

    test('Create tag3', async () => {
      const { body } = await rq({
        url: '/content-manager/collection-types/api::tag.tag',
        method: 'POST',
        body: {
          name: 'tag3',
        },
      });

      data.tags.push(body);

      expect(body.id).toBeDefined();
      expect(body.name).toBe('tag3');
      expect(body.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.publishedAt).toBeUndefined();
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

      data.articles.push(body);

      expect(body.id).toBeDefined();
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(body.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.publishedAt).toBeUndefined();

      const tags = (await getRelations('article', 'tags', body.id)).results;
      expect(tags.length).toBe(0);
    });

    test('Create article2 with tag1', async () => {
      const entry = {
        title: 'Article 2',
        content: 'Content 2',
        tags: [data.tags[0].id],
      };

      const { body } = await rq({
        url: '/content-manager/collection-types/api::article.article',
        method: 'POST',
        body: entry,
      });

      data.articles.push(body);

      expect(body.id).toBeDefined();
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(body.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.publishedAt).toBeUndefined();

      const tags = (await getRelations('article', 'tags', body.id)).results;
      expect(tags.length).toBe(1);
      expect(tags[0].id).toBe(data.tags[0].id);
    });

    test('Update article1 add tag2', async () => {
      const entry = { ...data.articles[0], tags: [data.tags[1].id] };

      cleanDate(entry);

      const { body } = await rq({
        url: `/content-manager/collection-types/api::article.article/${entry.id}`,
        method: 'PUT',
        body: entry,
      });

      data.articles[0] = body;

      expect(body.id).toBeDefined();
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(body.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.publishedAt).toBeUndefined();

      const tags = (await getRelations('article', 'tags', body.id)).results;
      expect(tags.length).toBe(1);
      expect(tags[0].id).toBe(data.tags[1].id);
    });

    test('Update article1 add tag1 and tag3', async () => {
      const { body } = await rq({
        url: `/content-manager/collection-types/api::article.article/${data.articles[0].id}`,
        method: 'PUT',
        body: {
          tags: [data.tags[0].id, data.tags[1].id, data.tags[2].id],
        },
      });

      expect(body.id).toBeDefined();
      expect(body.title).toBe(data.articles[0].title);
      expect(body.content).toBe(data.articles[0].content);
      expect(body.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.publishedAt).toBeUndefined();

      const tags = (await getRelations('article', 'tags', body.id)).results;
      expect(tags.length).toBe(3);
    });

    test('Update article1 remove one tag', async () => {
      const { body } = await rq({
        url: `/content-manager/collection-types/api::article.article/${data.articles[0].id}`,
        method: 'PUT',
        body: {
          tags: [data.tags[1].id, data.tags[2].id],
        },
      });

      expect(body.id).toBeDefined();
      expect(body.title).toBe(data.articles[0].title);
      expect(body.content).toBe(data.articles[0].content);
      expect(body.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.publishedAt).toBeUndefined();

      const tags = (await getRelations('article', 'tags', body.id)).results;
      expect(tags.length).toBe(2);
    });

    test('Update article1 remove all tag', async () => {
      const entry = { ...data.articles[0], tags: [] };

      cleanDate(entry);

      const { body } = await rq({
        url: `/content-manager/collection-types/api::article.article/${entry.id}`,
        method: 'PUT',
        body: entry,
      });

      data.articles[0] = body;

      expect(body.id).toBeDefined();
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(body.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.publishedAt).toBeUndefined();

      const tags = (await getRelations('article', 'tags', body.id)).results;
      expect(tags.length).toBe(0);
    });

    test('Delete all articles should remove the association in each tags related to them', async () => {
      const { body: createdTag } = await rq({
        url: '/content-manager/collection-types/api::tag.tag',
        method: 'POST',
        body: {
          name: 'tag11',
        },
      });

      const { body: article12 } = await rq({
        url: '/content-manager/collection-types/api::article.article',
        method: 'POST',
        body: {
          title: 'article12',
          content: 'Content',
          tags: [createdTag.id],
        },
      });

      const { body: updatedTag } = await rq({
        url: `/content-manager/collection-types/api::tag.tag/${createdTag.id}`,
        method: 'GET',
      });

      const { body: article13 } = await rq({
        url: '/content-manager/collection-types/api::article.article',
        method: 'POST',
        body: {
          title: 'article13',
          content: 'Content',
          tags: [updatedTag.id],
        },
      });

      const { body: foundTag } = await rq({
        url: `/content-manager/collection-types/api::tag.tag/${createdTag.id}`,
        method: 'GET',
      });

      expect(foundTag.articles.count).toBe(2);

      await rq({
        url: '/content-manager/collection-types/api::article.article/actions/bulkDelete',
        method: 'POST',
        body: {
          ids: [article12.id, article13.id],
        },
      });

      const { body: foundTag2 } = await rq({
        url: `/content-manager/collection-types/api::tag.tag/${createdTag.id}`,
        method: 'GET',
      });

      expect(foundTag2.articles.count).toBe(0);
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
      const { body: createdTag } = await rq({
        url: '/content-manager/collection-types/api::tag.tag',
        method: 'POST',
        body: {
          name: 'tag11',
        },
      });

      data.tags.push(createdTag);

      const entry = {
        tags: [createdTag.id],
      };

      const { body } = await rq({
        url: '/content-manager/collection-types/api::articlewithtag.articlewithtag',
        method: 'POST',
        body: entry,
      });

      data.articlesWithTag.push(body);

      expect(body.id).toBeDefined();
      expect(body.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });

      const tags = (await getRelations('articlewithtag', 'tags', body.id)).results;
      expect(tags.length).toBe(1);
      expect(tags[0].id).toBe(data.tags[0].id);
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

      data.categories.push(body);

      expect(body.id).toBeDefined();
      expect(body.name).toBe('cat1');
      expect(body.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.publishedAt).toBeUndefined();

      const articles = (await getRelations('category', 'articles', body.id)).results;
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

      data.categories.push(body);

      expect(body.id).toBeDefined();
      expect(body.name).toBe('cat2');
      expect(body.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.publishedAt).toBeUndefined();
      const articles = (await getRelations('category', 'articles', body.id)).results;
      expect(articles.length).toBe(0);
    });

    test('Create article1 with cat1', async () => {
      const entry = {
        title: 'Article 1',
        content: 'Content 1',
        category: data.categories[0].id,
      };

      const { body } = await rq({
        url: '/content-manager/collection-types/api::article.article',
        method: 'POST',
        body: entry,
      });

      data.articles.push(body);

      expect(body.id).toBeDefined();
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(body.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.publishedAt).toBeUndefined();

      const tags = (await getRelations('article', 'tags', body.id)).results;
      expect(tags.length).toBe(0);

      const category = (await getRelations('article', 'category', body.id)).data;
      expect(category.name).toBe(data.categories[0].name);
    });

    test('Update article1 with cat2', async () => {
      const { body } = await rq({
        url: `/content-manager/collection-types/api::article.article/${data.articles[0].id}`,
        method: 'PUT',
        body: {
          category: data.categories[1].id,
        },
      });

      data.articles[0] = body;

      expect(body.id).toBeDefined();
      expect(body.title).toBe(data.articles[0].title);
      expect(body.content).toBe(data.articles[0].content);
      expect(body.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });

      const tags = (await getRelations('article', 'tags', body.id)).results;
      expect(tags.length).toBe(0);

      const category = (await getRelations('article', 'category', body.id)).data;
      expect(category.name).toBe(data.categories[1].name);
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

      data.articles.push(body);

      expect(body.id).toBeDefined();
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(body.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });

      const tags = (await getRelations('article', 'tags', body.id)).results;
      expect(tags.length).toBe(0);
    });

    test('Update article2 with cat2', async () => {
      const { body } = await rq({
        url: `/content-manager/collection-types/api::article.article/${data.articles[1].id}`,
        method: 'PUT',
        body: {
          category: data.categories[1].id,
        },
      });

      data.articles[1] = body;

      expect(body.id).toBeDefined();
      expect(body.title).toBe(data.articles[1].title);
      expect(body.content).toBe(data.articles[1].content);
      expect(body.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });

      const tags = (await getRelations('article', 'tags', body.id)).results;
      expect(tags.length).toBe(0);

      const category = (await getRelations('article', 'category', body.id)).data;
      expect(category.name).toBe(data.categories[1].name);
    });

    test('Update cat1 with article1', async () => {
      const { body } = await rq({
        url: `/content-manager/collection-types/api::category.category/${data.categories[0].id}`,
        method: 'PUT',
        body: {
          articles: [data.articles[0].id],
        },
      });

      data.categories[0] = body;

      expect(body.id).toBeDefined();
      expect(body.name).toBe(data.categories[0].name);
      expect(body.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });

      const articles = (await getRelations('category', 'articles', body.id)).results;
      expect(articles.length).toBe(1);
    });

    test('Create cat3 with article1', async () => {
      const entry = {
        name: 'cat3',
        articles: [data.articles[0].id],
      };

      const { body } = await rq({
        url: '/content-manager/collection-types/api::category.category',
        method: 'POST',
        body: entry,
      });

      data.categories.push(body);

      expect(body.id).toBeDefined();
      expect(body.name).toBe(entry.name);
      expect(body.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });

      const articles = (await getRelations('category', 'articles', body.id)).results;
      expect(articles.length).toBe(1);
    });

    test('Get article1 with cat3', async () => {
      const { body } = await rq({
        url: `/content-manager/relations/api::article.article/${data.articles[0].id}/category`,
        method: 'GET',
      });

      expect(body).toMatchObject({ data: { name: 'cat3' } });
    });

    test('Get article2 with cat2', async () => {
      const { body } = await rq({
        url: `/content-manager/relations/api::article.article/${data.articles[1].id}/category`,
        method: 'GET',
      });

      expect(body).toMatchObject({ data: { name: 'cat2' } });
    });

    test('Get cat1 without relations', async () => {
      const { body } = await rq({
        url: `/content-manager/relations/api::category.category/${data.categories[0].id}/articles`,
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
        url: `/content-manager/relations/api::category.category/${data.categories[1].id}/articles`,
        method: 'GET',
      });

      expect(body).toMatchObject({
        pagination: { page: 1, pageCount: 1, pageSize: 10, total: 1 },
        results: [{ title: 'Article 2' }],
      });
    });

    test('Get cat3 with article1', async () => {
      const { body } = await rq({
        url: `/content-manager/relations/api::category.category/${data.categories[2].id}/articles`,
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

      data.references.push(body);

      expect(body.id).toBeDefined();
      expect(body.name).toBe('ref1');
      expect(body.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.updatedBy).toMatchObject({
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

      data.articles.push(body);

      expect(body.id).toBeDefined();
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(body.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.publishedAt).toBeUndefined();
    });

    test('Update article1 with ref1', async () => {
      const { body } = await rq({
        url: `/content-manager/collection-types/api::article.article/${data.articles[0].id}`,
        method: 'PUT',
        body: {
          reference: data.references[0].id,
        },
      });

      data.articles[0] = body;

      expect(body.id).toBeDefined();
      expect(body.title).toBe(data.articles[0].title);
      expect(body.content).toBe(data.articles[0].content);
      expect(body.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });

      const reference = (await getRelations('article', 'reference', body.id)).data;
      expect(reference.id).toBe(data.references[0].id);
    });

    test('Create article2 with ref1', async () => {
      const entry = {
        title: 'Article 2',
        content: 'Content 2',
        reference: data.references[0].id,
      };

      const { body } = await rq({
        url: '/content-manager/collection-types/api::article.article',
        method: 'POST',
        body: entry,
      });

      data.articles.push(body);

      expect(body.id).toBeDefined();
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(body.createdBy).toMatchObject({
        id: 1,
        username: null,
      });
      expect(body.updatedBy).toMatchObject({
        id: 1,
        username: null,
      });
      const reference = (await getRelations('article', 'reference', body.id)).data;
      expect(reference.id).toBe(data.references[0].id);
    });
  });

  describe('Test oneWay relation (reference - tag) with Content Manager', () => {
    test('Attach Tag to a Reference', async () => {
      const { body: createdTag } = await rq({
        url: '/content-manager/collection-types/api::tag.tag',
        method: 'POST',
        body: {
          name: 'tag111',
        },
      });

      const { body: createdReference } = await rq({
        url: '/content-manager/collection-types/api::reference.reference',
        method: 'POST',
        body: {
          name: 'cat111',
          tag: createdTag.id,
        },
      });

      expect(createdReference.id).toBeDefined();

      const tag = (await getRelations('reference', 'tag', createdReference.id)).data;
      expect(tag.id).toBe(createdTag.id);
    });

    test('Detach Tag to a Reference', async () => {
      const { body: createdTag } = await rq({
        url: '/content-manager/collection-types/api::tag.tag',
        method: 'POST',
        body: {
          name: 'tag111',
        },
      });

      const { body: createdReference } = await rq({
        url: '/content-manager/collection-types/api::reference.reference',
        method: 'POST',
        body: {
          name: 'cat111',
          tag: createdTag.id,
        },
      });

      let tag = (await getRelations('reference', 'tag', createdReference.id)).data;
      expect(tag.id).toBe(createdTag.id);

      const { body: referenceToUpdate } = await rq({
        url: `/content-manager/collection-types/api::reference.reference/${createdReference.id}`,
        method: 'PUT',
        body: {
          tag: null,
        },
      });

      tag = (await getRelations('reference', 'tag', referenceToUpdate.id)).results;
      expect(isEmpty(tag)).toBe(true);
    });

    test('Delete Tag so the relation in the Reference side should be removed', async () => {
      const { body: createdTag } = await rq({
        url: '/content-manager/collection-types/api::tag.tag',
        method: 'POST',
        body: {
          name: 'tag111',
        },
      });

      const { body: createdReference } = await rq({
        url: '/content-manager/collection-types/api::reference.reference',
        method: 'POST',
        body: {
          name: 'cat111',
          tag: createdTag.id,
        },
      });

      await rq({
        url: `/content-manager/collection-types/api::tag.tag/${createdTag.id}`,
        method: 'DELETE',
      });

      const { body: foundReference } = await rq({
        url: `/content-manager/collection-types/api::reference.reference/${createdReference.id}`,
        method: 'GET',
      });

      expect(foundReference.tag.count).toBe(0);
    });
  });
});
