let request = require('request');

const form = require('./helpers/generators');
const restart = require('./helpers/restart');

request = request.defaults({
  baseUrl: 'http://localhost:1337'
});

const rq = (options) => {
  const params = JSON.parse(JSON.stringify(options));

  for (let key in params.formData) {
    if (typeof params.formData[key] === 'object') {
      params.formData[key] = JSON.stringify(params.formData[key]);
    }
  }
  return new Promise((resolve, reject) => {
    request(params, (err, res, body) => {
      if (err || res.statusCode < 200 || res.statusCode >= 300) {
        return reject(err || body);
      }

      return resolve(body);
    });
  });
}

const cleanDate = (entry) => {
  delete entry.updatedAt;
  delete entry.createdAt;
  delete entry.created_at;
  delete entry.updated_at;
};

let data;

describe('App setup auth', () => {
  test(
    'Register admin user',
    async () => {
      const body = await rq({
        url: `/auth/local/register`,
        method: 'POST',
        body: {
          username: 'admin',
          email: 'admin@strapi.io',
          password: 'pcw123'
        },
        json: true
      });

      request = request.defaults({
        headers: {
          'Authorization': `Bearer ${body.jwt}`
        }
      });
    }
  );
});

describe('Generate test APIs', () => {
  beforeEach(async () => {
    await restart(rq);
  }, 60000);

  test(
    'Create new article API',
    async () => {
      await rq({
        url: `/content-type-builder/models`,
        method: 'POST',
        body: form.article,
        json: true
      });
    }
  );
  test(
    'Create new tag API',
    async () => {
      await rq({
        url: `/content-type-builder/models`,
        method: 'POST',
        body: form.tag,
        json: true
      });
    }
  );
  test(
    'Create new category API',
    async () => {
      await rq({
        url: `/content-type-builder/models`,
        method: 'POST',
        body: form.category,
        json: true
      });
    }
  );
  test(
    'Create new reference API',
    async () => {
      await rq({
        url: `/content-type-builder/models`,
        method: 'POST',
        body: form.reference,
        json: true
      });
    }
  );
});

describe('Test manyToMany relation (article - tag) with Content Manager', () => {
  beforeAll(() => {
    data = {
      articles: [],
      tags: []
    };
  });

  beforeEach(async () => {
    await restart(rq);
  }, 60000);

  test(
    'Create tag1',
    async () => {
      let body = await rq({
        url: `/content-manager/explorer/tag/?source=content-manager`,
        method: 'POST',
        formData: {
          name: 'tag1'
        }
      });

      body = JSON.parse(body);

      data.tags.push(body);

      expect(body.id);
      expect(Array.isArray(body.articles)).toBeTruthy();
      expect(body.name).toBe('tag1');
    }
  );
  test(
    'Create tag2',
    async () => {
      let body = await rq({
        url: `/content-manager/explorer/tag/?source=content-manager`,
        method: 'POST',
        formData: {
          name: 'tag2'
        }
      });

      body = JSON.parse(body);

      data.tags.push(body);

      expect(body.id);
      expect(Array.isArray(body.articles)).toBeTruthy();
      expect(body.name).toBe('tag2');
    }
  );
  test(
    'Create tag3',
    async () => {
      let body = await rq({
        url: `/content-manager/explorer/tag/?source=content-manager`,
        method: 'POST',
        formData: {
          name: 'tag3'
        }
      });

      body = JSON.parse(body);

      data.tags.push(body);

      expect(body.id);
      expect(Array.isArray(body.articles)).toBeTruthy();
      expect(body.name).toBe('tag3');
    }
  );
  test(
    'Create article1 without relation',
    async () => {
      const entry = {
        title: 'Article 1',
        content: 'My super content 1'
      };

      let body = await rq({
        url: `/content-manager/explorer/article/?source=content-manager`,
        method: 'POST',
        formData: entry
      });

      body = JSON.parse(body);

      data.articles.push(body);

      expect(body.id);
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(Array.isArray(body.tags)).toBeTruthy();
      expect(body.tags.length).toBe(0);
    }
  );
  test(
    'Create article2 with tag1',
    async () => {
      const entry = {
        title: 'Article 2',
        content: 'Content 2',
        tags: [data.tags[0]]
      };

      let body = await rq({
        url: `/content-manager/explorer/article/?source=content-manager`,
        method: 'POST',
        formData: entry
      });

      body = JSON.parse(body);

      data.articles.push(body);

      expect(body.id);
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(Array.isArray(body.tags)).toBeTruthy();
      expect(body.tags.length).toBe(1);
      expect(body.tags[0].id).toBe(data.tags[0].id);
    }
  );
  test(
    'Update article1 add tag2',
    async () => {
      const entry = Object.assign({}, data.articles[0], {
        tags: [data.tags[1]]
      });

      cleanDate(entry);

      let body = await rq({
        url: `/content-manager/explorer/article/${entry.id}?source=content-manager`,
        method: 'PUT',
        formData: entry
      });

      body = JSON.parse(body);

      data.articles[0] = body;

      expect(body.id);
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(Array.isArray(body.tags)).toBeTruthy();
      expect(body.tags.length).toBe(1);
      expect(body.tags[0].id).toBe(data.tags[1].id);
    }
  );
  test(
    'Update article1 add tag1 and tag3',
    async () => {
      const entry = Object.assign({}, data.articles[0]);
      entry.tags.push(data.tags[0]);
      entry.tags.push(data.tags[2]);

      cleanDate(entry);

      let body = await rq({
        url: `/content-manager/explorer/article/${entry.id}?source=content-manager`,
        method: 'PUT',
        formData: entry
      });

      body = JSON.parse(body);

      data.articles[0] = body;

      expect(body.id);
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(Array.isArray(body.tags)).toBeTruthy();
      expect(body.tags.length).toBe(3);
    }
  );
  test(
    'Update article1 remove one tag',
    async () => {
      const entry = Object.assign({}, data.articles[0]);
      entry.tags = entry.tags.slice(1);

      cleanDate(entry);

      let body = await rq({
        url: `/content-manager/explorer/article/${entry.id}?source=content-manager`,
        method: 'PUT',
        formData: entry
      });

      body = JSON.parse(body);

      data.articles[0] = body;

      expect(body.id);
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(Array.isArray(body.tags)).toBeTruthy();
      expect(body.tags.length).toBe(2);
    }
  );
  test(
    'Update article1 remove all tag',
    async () => {
      const entry = Object.assign({}, data.articles[0], {
        tags: []
      });

      cleanDate(entry);

      let body = await rq({
        url: `/content-manager/explorer/article/${entry.id}?source=content-manager`,
        method: 'PUT',
        formData: entry
      });

      body = JSON.parse(body);

      data.articles[0] = body;

      expect(body.id);
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(Array.isArray(body.tags)).toBeTruthy();
      expect(body.tags.length).toBe(0);
    }
  );
});

describe('Test oneToMany - manyToOne relation (article - category) with Content Manager', () => {
  beforeAll(() => {
    data = {
      articles: [],
      categories: []
    };
  });

  beforeEach(async () => {
    await restart(rq);
  }, 60000);

  test(
    'Create cat1',
    async () => {
      let body = await rq({
        url: `/content-manager/explorer/category/?source=content-manager`,
        method: 'POST',
        formData: {
          name: 'cat1'
        }
      });

      body = JSON.parse(body);

      data.categories.push(body);

      expect(body.id);
      expect(Array.isArray(body.articles)).toBeTruthy();
      expect(body.name).toBe('cat1');
    }
  );
  test(
    'Create cat2',
    async () => {
      let body = await rq({
        url: `/content-manager/explorer/category/?source=content-manager`,
        method: 'POST',
        formData: {
          name: 'cat2'
        }
      });

      body = JSON.parse(body);

      data.categories.push(body);

      expect(body.id);
      expect(Array.isArray(body.articles)).toBeTruthy();
      expect(body.name).toBe('cat2');
    }
  );
  test(
    'Create article1 with cat1',
    async () => {
      const entry = {
        title: 'Article 1',
        content: 'Content 1',
        category: data.categories[0]
      };

      let body = await rq({
        url: `/content-manager/explorer/article/?source=content-manager`,
        method: 'POST',
        formData: entry
      });

      body = JSON.parse(body);

      data.articles.push(body);

      expect(body.id);
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(body.category.name).toBe(entry.category.name);
      expect(Array.isArray(body.tags)).toBeTruthy();
    }
  );
  test(
    'Update article1 with cat2',
    async () => {
      const entry = Object.assign({}, data.articles[0], {
        category: data.categories[1]
      });

      cleanDate(entry);

      let body = await rq({
        url: `/content-manager/explorer/article/${entry.id}?source=content-manager`,
        method: 'PUT',
        formData: entry
      });

      body = JSON.parse(body);

      data.articles[0] = body;

      expect(body.id);
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(body.category.name).toBe(entry.category.name);
      expect(Array.isArray(body.tags)).toBeTruthy();
    }
  );
  test(
    'Create article2',
    async () => {
      const entry = {
        title: 'Article 2',
        content: 'Content 2'
      };

      let body = await rq({
        url: `/content-manager/explorer/article?source=content-manager`,
        method: 'POST',
        formData: entry
      });

      body = JSON.parse(body);

      data.articles.push(body);

      expect(body.id);
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(Array.isArray(body.tags)).toBeTruthy();
    }
  );
  test(
    'Update article2 with cat2',
    async () => {
      const entry = Object.assign({}, data.articles[1], {
        category: data.categories[1]
      });

      cleanDate(entry);

      let body = await rq({
        url: `/content-manager/explorer/article/${entry.id}?source=content-manager`,
        method: 'PUT',
        formData: entry
      });

      body = JSON.parse(body);

      data.articles[1] = body;

      expect(body.id);
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(body.category.name).toBe(entry.category.name);
      expect(Array.isArray(body.tags)).toBeTruthy();
    }
  );
  test(
    'Update cat1 with article1',
    async () => {
      const entry = Object.assign({}, data.categories[0]);
      entry.articles.push(data.articles[0]);

      cleanDate(entry);

      let body = await rq({
        url: `/content-manager/explorer/category/${entry.id}?source=content-manager`,
        method: 'PUT',
        formData: entry
      });

      body = JSON.parse(body);

      data.categories[0] = body;

      expect(body.id);
      expect(Array.isArray(body.articles)).toBeTruthy();
      expect(body.articles.length).toBe(1);
      expect(body.name).toBe(entry.name);
    }
  );
  test(
    'Create cat3 with article1',
    async () => {
      const entry = {
        name: 'cat3',
        articles: [data.articles[0]]
      };

      let body = await rq({
        url: `/content-manager/explorer/category/?source=content-manager`,
        method: 'POST',
        formData: entry
      });

      body = JSON.parse(body);

      data.categories.push(body);

      expect(body.id);
      expect(Array.isArray(body.articles)).toBeTruthy();
      expect(body.articles.length).toBe(1);
      expect(body.name).toBe(entry.name);
    }
  );
  test(
    'Get article1 with cat3',
    async () => {
      let body = await rq({
        url: `/content-manager/explorer/article/${data.articles[0].id}?source=content-manager`,
        method: 'GET'
      });

      body = JSON.parse(body);

      expect(body.id);
      expect(body.category.id).toBe(data.categories[2].id)
    }
  );
  test(
    'Get article2 with cat2',
    async () => {
      let body = await rq({
        url: `/content-manager/explorer/article/${data.articles[1].id}?source=content-manager`,
        method: 'GET'
      });

      body = JSON.parse(body);

      expect(body.id);
      expect(body.category.id).toBe(data.categories[1].id)
    }
  );
  test(
    'Get cat1 without relations',
    async () => {
      let body = await rq({
        url: `/content-manager/explorer/category/${data.categories[0].id}?source=content-manager`,
        method: 'GET'
      });

      body = JSON.parse(body);

      expect(body.id);
      expect(body.articles.length).toBe(0);
    }
  );
  test(
    'Get cat2 with article2',
    async () => {
      let body = await rq({
        url: `/content-manager/explorer/category/${data.categories[1].id}?source=content-manager`,
        method: 'GET'
      });

      body = JSON.parse(body);

      expect(body.id);
      expect(body.articles.length).toBe(1);
      expect(body.articles[0].id).toBe(data.articles[1].id);
    }
  );
  test(
    'Get cat3 with article1',
    async () => {
      let body = await rq({
        url: `/content-manager/explorer/category/${data.categories[2].id}?source=content-manager`,
        method: 'GET'
      });

      body = JSON.parse(body);

      expect(body.id);
      expect(body.articles.length).toBe(1);
      expect(body.articles[0].id).toBe(data.articles[0].id);
    }
  );
});

describe('Test oneToOne relation (article - reference) with Content Manager', () => {
  beforeAll(() => {
    data = {
      articles: [],
      references: []
    };
  });

  beforeEach(async () => {
    await restart(rq);
  }, 60000);

  test(
    'Create ref1',
    async () => {
      let body = await rq({
        url: `/content-manager/explorer/reference/?source=content-manager`,
        method: 'POST',
        formData: {
          name: 'ref1'
        }
      });

      body = JSON.parse(body);

      data.references.push(body);

      expect(body.id);
      expect(body.name).toBe('ref1');
    }
  );
  test(
    'Create article1',
    async () => {
      const entry = {
        title: 'Article 1',
        content: 'Content 1'
      };

      let body = await rq({
        url: `/content-manager/explorer/article?source=content-manager`,
        method: 'POST',
        formData: entry
      });

      body = JSON.parse(body);

      data.articles.push(body);

      expect(body.id);
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
    }
  );
  test(
    'Update article1 with ref1',
    async () => {
      const entry = Object.assign({}, data.articles[0], {
        reference: data.references[0].id
      });

      cleanDate(entry);

      let body = await rq({
        url: `/content-manager/explorer/article/${entry.id}?source=content-manager`,
        method: 'PUT',
        formData: entry
      });

      body = JSON.parse(body);

      data.articles[0] = body;

      expect(body.id);
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(body.reference.id).toBe(entry.reference);
    }
  );
  test(
    'Create article2 with ref1',
    async () => {
      const entry = {
        title: 'Article 2',
        content: 'Content 2',
        reference: data.references[0].id
      };

      let body = await rq({
        url: `/content-manager/explorer/article?source=content-manager`,
        method: 'POST',
        formData: entry
      });

      body = JSON.parse(body);

      data.articles.push(body);

      expect(body.id);
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(body.reference.id).toBe(entry.reference);
    }
  );
  test(
    'Get article1 without relations',
    async () => {
      let body = await rq({
        url: `/content-manager/explorer/article/${data.articles[0].id}?source=content-manager`,
        method: 'GET'
      });

      body = JSON.parse(body);

      expect(body.id);
      expect(body.reference).toBe(null);
    }
  );
});

describe('Test route /count from generated API', () => {
  beforeAll(() => {
    data = {
      articles: [],
      tags: []
    };
  });

  beforeEach(async () => {
    await restart(rq);
  }, 60000);

  test(
    'Create new product API',
    async () => {
      await rq({
        url: `/content-type-builder/models`,
        method: 'POST',
        body: form.product,
        json: true
      });
    }
  );
  test(
    'Create product1',
    async () => {
      let body = await rq({
        url: `/content-manager/explorer/product/?source=content-manager`,
        method: 'POST',
        formData: {
          name: 'product1'
        }
      });

      body = JSON.parse(body);

      data.tags.push(body);

      expect(body.id);
      expect(body.name).toBe('product1');
    }
  );
  test(
    'Create product2',
    async () => {
      let body = await rq({
        url: `/content-manager/explorer/product/?source=content-manager`,
        method: 'POST',
        formData: {
          name: 'product2'
        }
      });

      body = JSON.parse(body);

      data.tags.push(body);

      expect(body.id);
      expect(body.name).toBe('product2');
    }
  );
  test(
    'Count products',
    async () => {
      let body = await rq({
        url: `/product/count`,
        method: 'GET'
      });

      body = JSON.parse(body);

      data.tags.push(body);

      expect(body).toBe(2);
    }
  );
});

describe('Delete test APIs', () => {
  beforeEach(async () => {
    await restart(rq);
  }, 60000);

  test(
    'Delete article API',
    async () => {
      await rq({
        url: `/content-type-builder/models/article`,
        method: 'DELETE',
        json: true
      });
    }
  );
  test(
    'Delete tag API',
    async () => {
      await rq({
        url: `/content-type-builder/models/tag`,
        method: 'DELETE',
        json: true
      });
    }
  );
  test(
    'Delete category API',
    async () => {
      await rq({
        url: `/content-type-builder/models/category`,
        method: 'DELETE',
        json: true
      });
    }
  );
});
