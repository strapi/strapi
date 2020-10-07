'use strict';

// Helpers.
const { registerAndLogin } = require('../../../test/helpers/auth');
const { createAuthRequest } = require('../../../test/helpers/request');

let rq;

describe('Upload plugin end to end tests', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);
  }, 60000);

  describe('GET /upload/proxy => Proxy the file', () => {
    test('Return the remote URL', async () => {
      const res = await rq.get('/upload/proxy', {
        qs: {
          url: 'https://strapi.io/',
        },
      });
      expect(res.statusCode).toBe(200);
    });

    test('Accept an url with utf-8 characters', async () => {
      const res = await rq.get('/upload/proxy', {
        qs: {
          url: 'https://strapi.io/?foo=网',
        },
      });

      expect(res.statusCode).toBe(200);
    });

    test('Return 400 with an invalid url', async () => {
      const res = await rq.get('/upload/proxy');

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual('Invalid URL');
    });
  });
});
