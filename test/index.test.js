let request = require('request');

const form = require('./helper/generators');
const restart = require('./helper/restart');

request = request.defaults({
  baseUrl: 'http://localhost:1337'
});

const rq = (params) => {
  return new Promise((resolve, reject) => {
    request(params, (err, res, body) => {
      if (err || res.statusCode < 200 || res.statusCode >= 300) {
        return reject(err || body);
      }

      return resolve(body);
    });
  });
}

const data = {};

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
});

describe('Test data GET/POST/PUT/DELETE with Content Manager', () => {
  beforeEach(async () => {
    await restart(rq);
  }, 60000);

  test(
    'Create tag news',
    async () => {
      let body = await rq({
        url: `/content-manager/explorer/tag/?source=content-manager`,
        method: 'POST',
        formData: {
          name: 'news'
        }
      });

      body = JSON.parse(body);

      expect(body._id);
      expect(body.id);
      expect(Array.isArray(body.articles)).toBeTruthy();
      expect(body.name).toBe('news');
    }
  );
  test(
    'Create tag article',
    async () => {
      let body = await rq({
        url: `/content-manager/explorer/tag/?source=content-manager`,
        method: 'POST',
        formData: {
          name: 'content'
        }
      });

      body = JSON.parse(body);

      expect(body._id);
      expect(body.id);
      expect(Array.isArray(body.articles)).toBeTruthy();
      expect(body.name).toBe('content');
    }
  );
  test(
    'Get tags and get 2 entities',
    async () => {
      const body = await rq({
        url: `/content-manager/explorer/tag?limit=10&skip=0&sort=_id&source=content-manager`,
        method: 'GET'
      });

      data.tags = JSON.parse(body);

      expect(data.tags.length).toBe(2);
    }
  );
  test(
    'Create article 1 with tag relation',
    async () => {
      const entry = {
        title: 'Article 1',
        content: 'Content 1',
        tags: JSON.stringify([data.tags[0]]),
        cover: {}
      };

      let body = await rq({
        url: `/content-manager/explorer/article/?source=content-manager`,
        method: 'POST',
        formData: entry
      });

      body = JSON.parse(body);

      expect(body._id);
      expect(body.id);
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(Array.isArray(body.tags)).toBeTruthy();
      expect(body.tags.length).toBe(1);
      expect(body.tags[0].id).toBe(data.tags[0].id);
    }
  );
  test(
    'Create article 2 without relation',
    async () => {
      const entry = {
        title: 'Article 2',
        content: 'My super content 1',
        cover: {}
      };

      let body = await rq({
        url: `/content-manager/explorer/article/?source=content-manager`,
        method: 'POST',
        formData: entry
      });

      body = JSON.parse(body);

      expect(body._id);
      expect(body.id);
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(Array.isArray(body.tags)).toBeTruthy();
      expect(body.tags.length).toBe(0);
    }
  );
  test(
    'Get articles and get 2 entities',
    async () => {
      const body = await rq({
        url: `/content-manager/explorer/article?limit=10&skip=0&sort=_id&source=content-manager`,
        method: 'GET'
      });

      data.articles = JSON.parse(body);

      expect(data.articles.length).toBe(2);
    }
  );
  test(
    'Update article 2 add tag relation',
    async () => {
      const entry = Object.assign({}, data.articles[1], {
        tags: JSON.stringify([data.tags[1]])
      });

      delete entry.updatedAt;
      delete entry.createdAt;

      let body = await rq({
        url: `/content-manager/explorer/article/${entry.id}?source=content-manager`,
        method: 'PUT',
        formData: entry
      });

      body = JSON.parse(body);

      expect(body._id);
      expect(body.id);
      expect(body.title).toBe(entry.title);
      expect(body.content).toBe(entry.content);
      expect(Array.isArray(body.tags)).toBeTruthy();
      expect(body.tags.length).toBe(1);
      expect(body.tags[0].id).toBe(data.tags[1].id);
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
