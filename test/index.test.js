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
      await rq({
        url: `/content-manager/explorer/tag/?source=content-manager`,
        method: 'POST',
        formData: {
          name: 'news'
        }
      });
    }
  );
  test(
    'Create tag article',
    async () => {
      await rq({
        url: `/content-manager/explorer/tag/?source=content-manager`,
        method: 'POST',
        formData: {
          name: 'content'
        }
      });
    }
  );
  test(
    'Get tags',
    async () => {
      const body = await rq({
        url: `/tag`,
        method: 'GET'
      });

      data.tags = JSON.parse(body);
    }
  );
  test(
    'Create article 1 with tag relation',
    async () => {
      await rq({
        url: `/content-manager/explorer/article/?source=content-manager`,
        method: 'POST',
        formData: {
          title: 'Article 1',
          content: 'My super content 1',
          tags: JSON.stringify([data.tags[0]])
        }
      });
    }
  );
});
