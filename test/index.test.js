const axios = require('axios');

const request = axios.create({
  baseURL: 'http://localhost:1337',
});

const params = require('./helper/generators');
const restart = require('./helper/restart');

describe('App setup auth', () => {
  test(
    'Register admin user',
    async () => {
      const body = await request.post('/auth/local/register', {
      	username: 'admin',
      	email: 'admin@strapi.io',
      	password: 'pcw123'
      });

      axios.defaults.headers.common['Authorization'] = `Bearer ${body.data.jwt}`;
    }
  );
});

describe('Generate test APIs', () => {
  beforeEach(async () => {
    await restart(request);
  }, 60000);

  test(
    'Create new article API',
    async () => {
      await request.post('/content-type-builder/models', params.article);
    }
  );
  test(
    'Create new tag API',
    async () => {
      await request.post('/content-type-builder/models', params.tag);
    }
  );
  test(
    'Create new category API',
    async () => {
      await request.post('/content-type-builder/models', params.category);
    }
  );
});
