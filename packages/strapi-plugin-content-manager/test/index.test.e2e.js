// Helpers.
const { registerAndLogin } = require('../../../test/helpers/auth');
const createModelsUtils = require('../../../test/helpers/models');
const form = require('../../../test/helpers/generators');
const { createAuthRequest } = require('../../../test/helpers/request');

const cleanDate = entry => {
  delete entry.updatedAt;
  delete entry.createdAt;
  delete entry.created_at;
  delete entry.updated_at;
};

let data;
let modelsUtils;
let rq;

describe('Content Manager End to End', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);

    modelsUtils = createModelsUtils({ rq });

    await modelsUtils.createModels([
      form.article,
      form.tag,
      form.category,
      form.reference,
      form.product,
    ]);
  }, 60000);

  afterAll(
    () =>
      modelsUtils.deleteModels([
        'article',
        'tag',
        'category',
        'reference',
        'product',
      ]),
    60000
  );

  describe('Test manyToMany relation (article - tag) with Content Manager', () => {
    beforeAll(async () => {
      data = {
        articles: [],
        tags: [],
      };
    });

    test('Create tag1', async () => {
      let { body } = await rq({
        url: '/content-manager/explorer/tag/?source=content-manager',
        method: 'POST',
        formData: {
          name: 'tag1',
        },
      });

      data.tags.push(body);

      expect(body.id);
      expect(Array.isArray(body.articles)).toBeTruthy();
      expect(body.name).toBe('tag1');
    });

    test('Create tag2', async () => {
      let { body } = await rq({
        url: '/content-manager/explorer/tag/?source=content-manager',
        method: 'POST',
        formData: {
          name: 'tag2',
        },
      });

      data.tags.push(body);

      expect(body.id);
      expect(Array.isArray(body.articles)).toBeTruthy();
      expect(body.name).toBe('tag2');
    });

    test('Create tag3', async () => {
      let { body } = await rq({
        url: '/content-manager/explorer/tag/?source=content-manager',
        method: 'POST',
        formData: {
          name: 'tag3',
        },
      });

      data.tags.push(body);

      expect(body.id);
      expect(Array.isArray(body.articles)).toBeTruthy();
      expect(body.name).toBe('tag3');
    });

    test('Create article1 without relation', async () => {
      const entry = {
        title: 'Article 1',
        content: 'My super content 1',
      };

      let { body } = await rq({
        url: '/content-manager/explorer/article/?source=content-manager',
        method: 'POST',
        formData: entry,
      });

      data.articles.push(body);

      expect(body.id);
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(Array.isArray(body.tags)).toBeTruthy();
      expect(body.tags.length).toBe(0);
    });

    test('Create article2 with tag1', async () => {
      const entry = {
        title: 'Article 2',
        content: 'Content 2',
        tags: [data.tags[0]],
      };

      let { body } = await rq({
        url: '/content-manager/explorer/article/?source=content-manager',
        method: 'POST',
        formData: entry,
      });

      data.articles.push(body);

      expect(body.id);
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(Array.isArray(body.tags)).toBeTruthy();
      expect(body.tags.length).toBe(1);
      expect(body.tags[0].id).toBe(data.tags[0].id);
    });

    test('Update article1 add tag2', async () => {
      const entry = Object.assign({}, data.articles[0], {
        tags: [data.tags[1]],
      });

      cleanDate(entry);

      let { body } = await rq({
        url: `/content-manager/explorer/article/${
          entry.id
        }?source=content-manager`,
        method: 'PUT',
        formData: entry,
      });

      data.articles[0] = body;

      expect(body.id);
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(Array.isArray(body.tags)).toBeTruthy();
      expect(body.tags.length).toBe(1);
      expect(body.tags[0].id).toBe(data.tags[1].id);
    });

    test('Update article1 add tag1 and tag3', async () => {
      const entry = Object.assign({}, data.articles[0]);
      entry.tags.push(data.tags[0]);
      entry.tags.push(data.tags[2]);

      cleanDate(entry);

      let { body } = await rq({
        url: `/content-manager/explorer/article/${
          entry.id
        }?source=content-manager`,
        method: 'PUT',
        formData: entry,
      });

      data.articles[0] = body;

      expect(body.id);
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(Array.isArray(body.tags)).toBeTruthy();
      expect(body.tags.length).toBe(3);
    });

    test('Update article1 remove one tag', async () => {
      const entry = Object.assign({}, data.articles[0]);
      entry.tags = entry.tags.slice(1);

      cleanDate(entry);

      let { body } = await rq({
        url: `/content-manager/explorer/article/${
          entry.id
        }?source=content-manager`,
        method: 'PUT',
        formData: entry,
      });

      data.articles[0] = body;

      expect(body.id);
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(Array.isArray(body.tags)).toBeTruthy();
      expect(body.tags.length).toBe(2);
    });

    test('Update article1 remove all tag', async () => {
      const entry = Object.assign({}, data.articles[0], {
        tags: [],
      });

      cleanDate(entry);

      let { body } = await rq({
        url: `/content-manager/explorer/article/${
          entry.id
        }?source=content-manager`,
        method: 'PUT',
        formData: entry,
      });

      data.articles[0] = body;

      expect(body.id);
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(Array.isArray(body.tags)).toBeTruthy();
      expect(body.tags.length).toBe(0);
    });

    test('Delete all articles should remove the association in each tags related to them', async () => {
      const { body: createdTag } = await rq({
        url: '/content-manager/explorer/tag/?source=content-manager',
        method: 'POST',
        formData: {
          name: 'tag11',
        },
      });

      const { body: article12 } = await rq({
        url: '/content-manager/explorer/article/?source=content-manager',
        method: 'POST',
        formData: {
          title: 'article12',
          content: 'Content',
          tags: [createdTag],
        },
      });

      const { body: updatedTag } = await rq({
        url: `/content-manager/explorer/tag/${
          createdTag.id
        }?source=content-manager`,
        method: 'GET',
      });

      const { body: article13 } = await rq({
        url: '/content-manager/explorer/article/?source=content-manager',
        method: 'POST',
        formData: {
          title: 'article13',
          content: 'Content',
          tags: [updatedTag],
        },
      });

      const articles = [article12, article13];

      expect(Array.isArray(articles[0].tags)).toBeTruthy();
      expect(articles[0].tags.length).toBe(1);
      expect(Array.isArray(articles[1].tags)).toBeTruthy();
      expect(articles[1].tags.length).toBe(1);

      let { body: tagToGet } = await rq({
        url: `/content-manager/explorer/tag/${
          createdTag.id
        }?source=content-manager`,
        method: 'GET',
      });

      expect(Array.isArray(tagToGet.articles)).toBeTruthy();
      expect(tagToGet.articles.length).toBe(2);

      await rq({
        url: `/content-manager/explorer/deleteAll/article/?source=content-manager&${articles
          .map((article, index) => `${index}=${article.id}`)
          .join('&')}`,
        method: 'DELETE',
      });

      let { body: tagToGet2 } = await rq({
        url: `/content-manager/explorer/tag/${
          createdTag.id
        }?source=content-manager`,
        method: 'GET',
      });

      expect(Array.isArray(tagToGet2.articles)).toBeTruthy();
      expect(tagToGet2.articles.length).toBe(0);
    });
  });

  describe('Test oneToMany - manyToOne relation (article - category) with Content Manager', () => {
    beforeAll(() => {
      data = {
        articles: [],
        categories: [],
      };
    });

    test('Create cat1', async () => {
      let { body } = await rq({
        url: '/content-manager/explorer/category/?source=content-manager',
        method: 'POST',
        formData: {
          name: 'cat1',
        },
      });

      data.categories.push(body);

      expect(body.id);
      expect(Array.isArray(body.articles)).toBeTruthy();
      expect(body.name).toBe('cat1');
    });

    test('Create cat2', async () => {
      let { body } = await rq({
        url: '/content-manager/explorer/category/?source=content-manager',
        method: 'POST',
        formData: {
          name: 'cat2',
        },
      });

      data.categories.push(body);

      expect(body.id);
      expect(Array.isArray(body.articles)).toBeTruthy();
      expect(body.name).toBe('cat2');
    });

    test('Create article1 with cat1', async () => {
      const entry = {
        title: 'Article 1',
        content: 'Content 1',
        category: data.categories[0],
      };

      let { body } = await rq({
        url: '/content-manager/explorer/article/?source=content-manager',
        method: 'POST',
        formData: entry,
      });

      data.articles.push(body);

      expect(body.id);
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(body.category.name).toBe(entry.category.name);
      expect(Array.isArray(body.tags)).toBeTruthy();
    });

    test('Update article1 with cat2', async () => {
      const entry = Object.assign({}, data.articles[0], {
        category: data.categories[1],
      });

      cleanDate(entry);

      let { body } = await rq({
        url: `/content-manager/explorer/article/${
          entry.id
        }?source=content-manager`,
        method: 'PUT',
        formData: entry,
      });

      data.articles[0] = body;

      expect(body.id);
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(body.category.name).toBe(entry.category.name);
      expect(Array.isArray(body.tags)).toBeTruthy();
    });

    test('Create article2', async () => {
      const entry = {
        title: 'Article 2',
        content: 'Content 2',
      };

      let { body } = await rq({
        url: '/content-manager/explorer/article?source=content-manager',
        method: 'POST',
        formData: entry,
      });

      data.articles.push(body);

      expect(body.id);
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(Array.isArray(body.tags)).toBeTruthy();
    });

    test('Update article2 with cat2', async () => {
      const entry = Object.assign({}, data.articles[1], {
        category: data.categories[1],
      });

      cleanDate(entry);

      let { body } = await rq({
        url: `/content-manager/explorer/article/${
          entry.id
        }?source=content-manager`,
        method: 'PUT',
        formData: entry,
      });

      data.articles[1] = body;

      expect(body.id);
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(body.category.name).toBe(entry.category.name);
      expect(Array.isArray(body.tags)).toBeTruthy();
    });

    test('Update cat1 with article1', async () => {
      const entry = Object.assign({}, data.categories[0]);
      entry.articles.push(data.articles[0]);

      cleanDate(entry);

      let { body } = await rq({
        url: `/content-manager/explorer/category/${
          entry.id
        }?source=content-manager`,
        method: 'PUT',
        formData: entry,
      });

      data.categories[0] = body;

      expect(body.id);
      expect(Array.isArray(body.articles)).toBeTruthy();
      expect(body.articles.length).toBe(1);
      expect(body.name).toBe(entry.name);
    });

    test('Create cat3 with article1', async () => {
      const entry = {
        name: 'cat3',
        articles: [data.articles[0]],
      };

      let { body } = await rq({
        url: '/content-manager/explorer/category/?source=content-manager',
        method: 'POST',
        formData: entry,
      });

      data.categories.push(body);

      expect(body.id);
      expect(Array.isArray(body.articles)).toBeTruthy();
      expect(body.articles.length).toBe(1);
      expect(body.name).toBe(entry.name);
    });

    test('Get article1 with cat3', async () => {
      let { body } = await rq({
        url: `/content-manager/explorer/article/${
          data.articles[0].id
        }?source=content-manager`,
        method: 'GET',
      });

      expect(body.id);
      expect(body.category.id).toBe(data.categories[2].id);
    });

    test('Get article2 with cat2', async () => {
      let { body } = await rq({
        url: `/content-manager/explorer/article/${
          data.articles[1].id
        }?source=content-manager`,
        method: 'GET',
      });

      expect(body.id);
      expect(body.category.id).toBe(data.categories[1].id);
    });

    test('Get cat1 without relations', async () => {
      let { body } = await rq({
        url: `/content-manager/explorer/category/${
          data.categories[0].id
        }?source=content-manager`,
        method: 'GET',
      });

      expect(body.id);
      expect(body.articles.length).toBe(0);
    });

    test('Get cat2 with article2', async () => {
      let { body } = await rq({
        url: `/content-manager/explorer/category/${
          data.categories[1].id
        }?source=content-manager`,
        method: 'GET',
      });

      expect(body.id);
      expect(body.articles.length).toBe(1);
      expect(body.articles[0].id).toBe(data.articles[1].id);
    });

    test('Get cat3 with article1', async () => {
      let { body } = await rq({
        url: `/content-manager/explorer/category/${
          data.categories[2].id
        }?source=content-manager`,
        method: 'GET',
      });

      expect(body.id);
      expect(body.articles.length).toBe(1);
      expect(body.articles[0].id).toBe(data.articles[0].id);
    });
  });

  describe('Test oneToOne relation (article - reference) with Content Manager', () => {
    beforeAll(() => {
      data = {
        articles: [],
        references: [],
      };
    });

    test('Create ref1', async () => {
      let { body } = await rq({
        url: '/content-manager/explorer/reference/?source=content-manager',
        method: 'POST',
        formData: {
          name: 'ref1',
        },
      });

      data.references.push(body);

      expect(body.id);
      expect(body.name).toBe('ref1');
    });

    test('Create article1', async () => {
      const entry = {
        title: 'Article 1',
        content: 'Content 1',
      };

      let { body } = await rq({
        url: '/content-manager/explorer/article?source=content-manager',
        method: 'POST',
        formData: entry,
      });

      data.articles.push(body);

      expect(body.id);
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
    });

    test('Update article1 with ref1', async () => {
      const entry = Object.assign({}, data.articles[0], {
        reference: data.references[0].id,
      });

      cleanDate(entry);

      let { body } = await rq({
        url: `/content-manager/explorer/article/${
          entry.id
        }?source=content-manager`,
        method: 'PUT',
        formData: entry,
      });

      data.articles[0] = body;

      expect(body.id);
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(body.reference.id).toBe(entry.reference);
    });

    test('Create article2 with ref1', async () => {
      const entry = {
        title: 'Article 2',
        content: 'Content 2',
        reference: data.references[0].id,
      };

      let { body } = await rq({
        url: '/content-manager/explorer/article?source=content-manager',
        method: 'POST',
        formData: entry,
      });

      data.articles.push(body);

      expect(body.id);
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(body.reference.id).toBe(entry.reference);
    });
  });

  describe('Test oneWay relation (reference - tag) with Content Manager', () => {
    test('Attach Tag to a Reference', async () => {
      const { body: tagToCreate } = await rq({
        url: '/content-manager/explorer/tag/?source=content-manager',
        method: 'POST',
        formData: {
          name: 'tag111',
        },
      });

      const { body: referenceToCreate } = await rq({
        url: '/content-manager/explorer/reference/?source=content-manager',
        method: 'POST',
        formData: {
          name: 'cat111',
          tag: tagToCreate,
        },
      });

      expect(referenceToCreate.tag.id).toBe(tagToCreate.id);
    });

    test('Detach Tag to a Reference', async () => {
      const { body: tagToCreate } = await rq({
        url: '/content-manager/explorer/tag/?source=content-manager',
        method: 'POST',
        formData: {
          name: 'tag111',
        },
      });

      const { body: referenceToCreate } = await rq({
        url: '/content-manager/explorer/reference/?source=content-manager',
        method: 'POST',
        formData: {
          name: 'cat111',
          tag: tagToCreate,
        },
      });

      expect(referenceToCreate.tag.id).toBe(tagToCreate.id);

      const { body: referenceToUpdate } = await rq({
        url: `/content-manager/explorer/reference/${
          referenceToCreate.id
        }?source=content-manager`,
        method: 'PUT',
        formData: {
          tag: null,
        },
      });

      expect(referenceToUpdate.tag).toBe(null);
    });

    test('Delete Tag so the relation in the Reference side should be removed', async () => {
      const { body: tagToCreate } = await rq({
        url: '/content-manager/explorer/tag/?source=content-manager',
        method: 'POST',
        formData: {
          name: 'tag111',
        },
      });

      const { body: referenceToCreate } = await rq({
        url: '/content-manager/explorer/reference/?source=content-manager',
        method: 'POST',
        formData: {
          name: 'cat111',
          tag: tagToCreate,
        },
      });

      await rq({
        url: `/content-manager/explorer/tag/${
          tagToCreate.id
        }?source=content-manager`,
        method: 'DELETE',
      });

      const { body: referenceToGet } = await rq({
        url: `/content-manager/explorer/reference/${
          referenceToCreate.id
        }?source=content-manager`,
        method: 'GET',
      });

      if (!referenceToGet.tag || Object.keys(referenceToGet.tag).length == 0)
        return;
      expect(referenceToGet.tag).toBe(null);
    });
  });
});
