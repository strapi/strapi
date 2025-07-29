'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

// Import the upload function from the upload test
const { uploadFile, getFiles } = require('../upload/admin/file.test.api');

const builder = createTestBuilder();
let strapi;
let rq;

/**
 * Testing the Homepage API endpoints of the admin package.
 */
describe('Admin Homepage API', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  /**
   * GET /admin/homepage/key-statistics
   * - Used to display various project's statistics in a widget on the Homepage.
   */
  test('send key statistics about content across the cms', async () => {
    // Now call the key statistics endpoint
    const response = await rq({
      method: 'GET',
      url: '/admin/homepage/key-statistics',
    });

    expect(response.statusCode).toBe(200);
    // Default values
    expect(response.body.data).toMatchObject({
      assets: 1,
      contentTypes: 1,
      components: 0,
      locales: 1,
      admins: 1,
      webhooks: 0,
      apiTokens: 2,
    });

    // Perform a few actions that will update the key statistics
    // Upload a file
    const uploadRes = await uploadFile(rq);
    expect(uploadRes.statusCode).toBe(201);

    // Add a new API token
    await rq({
      method: 'POST',
      url: '/admin/api-tokens',
      body: {
        lifespan: null,
        description: '',
        type: 'full-access',
        name: 'RW - Full Access',
        permissions: null,
      },
    });

    // Add a new locale
    await rq({
      method: 'POST',
      url: '/i18n/locales',
      body: {
        code: 'es',
        name: 'Spanish',
        isDefault: true,
      },
    });

    // Add a new webhook
    await rq({
      method: 'POST',
      url: '/admin/webhooks',
      body: {
        events: [],
        headers: {},
        name: 'My test token',
        url: 'http://localhost/test-webhook',
      },
    });

    const responseUpdated = await rq({
      method: 'GET',
      url: '/admin/homepage/key-statistics',
    });

    expect(responseUpdated.statusCode).toBe(200);
    // Updated values
    expect(responseUpdated.body.data).toMatchObject({
      assets: 2,
      contentTypes: 1,
      components: 0,
      locales: 2,
      admins: 1,
      webhooks: 1,
      apiTokens: 3,
    });
  });
});
