'use strict';

const { createTestBuilder } = require('../../../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../../../test/helpers/request');

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

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
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
      expect(res.body).toMatchObject({
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

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        slug: null,
      });
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

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
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
      expect(res.body).toMatchObject({
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

    test('Cannot set value to be null', async () => {
      const res = await rq.post(
        '/content-manager/collection-types/api::withrequireduid.withrequireduid',
        {
          body: {
            slug: null,
          },
        }
      );

      expect(res.statusCode).toBe(400);
    });
  });
});
