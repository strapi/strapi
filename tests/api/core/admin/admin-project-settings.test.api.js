'use strict';

const fs = require('fs');
const path = require('path');

const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

describe('Project settings', () => {
  let rq;
  let strapi;

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  describe('Menu Logo', () => {
    test('Upload a new logo', async () => {
      const res = await rq({
        url: '/admin/project-settings',
        method: 'POST',
        formData: { menuLogo: fs.createReadStream(path.join(__dirname, './utils/logo.png')) },
      });

      expect(res.status).toBe(200);

      const getRes = await rq({
        url: '/admin/project-settings',
        method: 'GET',
      });

      expect(getRes.body).toMatchObject({
        menuLogo: {
          ext: '.png',
          height: 35,
          name: 'logo.png',
          size: 1.06,
          url: expect.anything(),
          width: 35,
        },
      });
    });

    test('Reset to Strapi logo', async () => {
      const postRes = await rq({
        url: '/admin/project-settings',
        method: 'POST',
        formData: { menuLogo: 'null' },
      });

      expect(postRes.status).toBe(200);

      const getRes = await rq({
        url: '/admin/project-settings',
        method: 'GET',
      });

      expect(getRes.body).toMatchObject({
        menuLogo: null,
      });
    });
  });
});
