'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

let strapi;
let rq;

describe('Test type UID', () => {
  describe('No targetField, required=false, not length limits', () => {
    const model = {
      displayName: 'With uid',
      singularName: 'withuid',
      pluralName: 'withuids',
      attributes: {
        slug: {
          type: 'uid',
        },
      },
    };

    const builder = createTestBuilder();

    beforeAll(async () => {
      await builder.addContentType(model).build();

      strapi = await createStrapiInstance();
      rq = await createAuthRequest({ strapi });
    });

    afterAll(async () => {
      await strapi.destroy();
      await builder.cleanup();
    });

    test('Creates an entry successfully', async () => {
      const res = await rq.post('/content-manager/collection-types/api::withuid.withuid', {
        body: {
          slug: 'valid-uid',
        },
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.data).toMatchObject({
        slug: 'valid-uid',
      });
    });

    // TODO: to handle with database UniqueError
    test.skip('Throws error on duplicate value', async () => {
      const res = await rq.post('/content-manager/collection-types/api::withuid.withuid', {
        body: {
          slug: 'duplicate-uid',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({
        slug: 'duplicate-uid',
      });

      const conflicting = await rq.post('/content-manager/collection-types/api::withuid.withuid', {
        body: {
          slug: 'duplicate-uid',
        },
      });

      expect(conflicting.statusCode).toBe(400);
    });

    test('Can set value to be null', async () => {
      const res = await rq.post('/content-manager/collection-types/api::withuid.withuid', {
        body: {
          slug: null,
        },
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.data).toMatchObject({
        slug: null,
      });
    });
  });

  describe('Value validation', () => {
    const model = {
      displayName: 'With uid',
      singularName: 'withuid',
      pluralName: 'withuids',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
      attributes: {
        slug: {
          type: 'uid',
        },
      },
    };

    const builder = createTestBuilder();

    const locales = ['en', 'fr'];
    beforeAll(async () => {
      await builder.addContentType(model).build();

      strapi = await createStrapiInstance();
      rq = await createAuthRequest({ strapi });

      for (const locale of locales) {
        await rq({
          method: 'POST',
          url: '/i18n/locales',
          body: {
            code: locale,
            name: `${locale}`,
            isDefault: false,
          },
        });
      }
    });

    afterAll(async () => {
      await strapi.destroy();
      await builder.cleanup();
    });

    test('Values should not have to be unique across different locales', async () => {
      const value = 'valid-uid';

      const endpoint = '/content-manager/collection-types/api::withuid.withuid';
      const englishEndpoint = `${endpoint}?locale=${locales[0]}`;
      const frenchEndpoint = `${endpoint}?locale=${locales[1]}`;

      const res = await rq.post(englishEndpoint, {
        body: {
          slug: value,
        },
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.data).toMatchObject({
        slug: value,
      });

      // Test that we cannot create a new entry with the same value in the same locale
      const sameLocaleResult = await rq.post(englishEndpoint, {
        body: {
          slug: value,
        },
      });
      expect(sameLocaleResult.statusCode).toBe(400);

      // Test that we can create a new entry with the same value in a different locale
      const newLocaleResult = await rq.post(frenchEndpoint, {
        body: {
          slug: value,
        },
      });
      expect(newLocaleResult.statusCode).toBe(201);
    });
  });

  describe('No targetField, required, no length limits', () => {
    const model = {
      displayName: 'withrequireduid',
      singularName: 'withrequireduid',
      pluralName: 'withrequireduids',
      attributes: {
        slug: {
          type: 'uid',
          required: true,
        },
      },
    };

    const builder = createTestBuilder();

    beforeAll(async () => {
      await builder.addContentType(model).build();

      strapi = await createStrapiInstance();
      rq = await createAuthRequest({ strapi });
    });

    afterAll(async () => {
      await strapi.destroy();
      await builder.cleanup();
    });

    test('Creates an entry successfully', async () => {
      const res = await rq.post(
        '/content-manager/collection-types/api::withrequireduid.withrequireduid',
        {
          body: {
            slug: 'valid-uid',
          },
        }
      );

      expect(res.statusCode).toBe(201);
      expect(res.body.data).toMatchObject({
        slug: 'valid-uid',
      });
    });

    // TODO: to handle with database UniqueError
    test.skip('Throws error on duplicate value', async () => {
      const res = await rq.post(
        '/content-manager/collection-types/api::withrequireduid.withrequireduid',
        {
          body: {
            slug: 'duplicate-uid',
          },
        }
      );

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({
        slug: 'duplicate-uid',
      });

      const conflicting = await rq.post(
        '/content-manager/collection-types/api::withrequireduid.withrequireduid',
        {
          body: {
            slug: 'duplicate-uid',
          },
        }
      );

      expect(conflicting.statusCode).toBe(400);
    });

    // TODO: Fix uniqueness and validations in document service -
    test.skip('Cannot set value to be null', async () => {
      const createRes = await rq.post(
        '/content-manager/collection-types/api::withrequireduid.withrequireduid',
        {
          body: {
            slug: null,
          },
        }
      );

      const res = await rq.post(
        `/content-manager/collection-types/api::withrequireduid.withrequireduid/${createRes.body.data.documentId}/actions/publish`
      );

      expect(res.statusCode).toBe(400);
    });
  });
});
