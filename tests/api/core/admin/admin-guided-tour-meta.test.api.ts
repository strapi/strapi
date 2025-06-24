import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createTestBuilder } from 'api-tests/builder';
import { Core } from '@strapi/types';

const articleContentType = {
  displayName: 'article',
  singularName: 'article',
  pluralName: 'articles',
  kind: 'collectionType',
  attributes: {
    name: {
      type: 'string',
    },
  },
};

let rq;
let strapi: Core.Strapi;
const builder = createTestBuilder();

const restartWithSchema = async () => {
  await strapi.destroy();
  await builder.cleanup();
  await builder.addContentType(articleContentType).build();
  strapi = await createStrapiInstance();
  rq = await createAuthRequest({ strapi });
};

describe('Guided Tour Meta', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('GET /admin/guided-tour-meta', () => {
    test('Returns correct initial state for a new installation', async () => {
      const res = await rq({
        url: '/admin/guided-tour-meta',
        method: 'GET',
        qs: { id: '1' },
      });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        isFirstSuperAdminUser: true,
        didCreateContentTypeSchema: false,
        didCreateContent: false,
        didCreateApiToken: false,
      });
    });

    test('Detects first super admin user', async () => {
      // Create a test user that is the first super admin
      const secondSuperAdminUser = await strapi.db.query('admin::user').create({
        data: { email: 'editor@editor.com', password: 'editor', roles: [1] },
      });

      const secondSuperAdminUserResponse = await rq({
        url: '/admin/guided-tour-meta',
        method: 'GET',
        qs: { id: secondSuperAdminUser.id },
      });

      expect(secondSuperAdminUserResponse.status).toBe(200);
      expect(secondSuperAdminUserResponse.body.data.isFirstSuperAdminUser).toBe(false);

      const res = await rq({
        url: '/admin/guided-tour-meta',
        method: 'GET',
        qs: { id: '1' },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.isFirstSuperAdminUser).toBe(true);
    });

    test('Detects created content type schemas', async () => {
      await restartWithSchema();

      const res = await rq({
        url: '/admin/guided-tour-meta',
        method: 'GET',
        qs: { id: '1' },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.didCreateContentTypeSchema).toBe(true);
    });

    test('Detects created content', async () => {
      await restartWithSchema();

      await strapi.documents('api::article.article').create({
        data: {
          name: 'Article 1',
        },
      });

      const res = await rq({
        url: '/admin/guided-tour-meta',
        method: 'GET',
        qs: { id: '1' },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.didCreateContent).toBe(true);
    });

    test('Detects created custom API tokens', async () => {
      // Create a custom API token
      const createdToken = await strapi.documents('admin::api-token').create({
        data: {
          name: 'Custom Token',
          type: 'read-only',
          description: 'Test token',
          accessKey: 'beep boop',
        },
      });

      const res = await rq({
        url: '/admin/guided-tour-meta',
        method: 'GET',
        qs: { id: '1' },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.didCreateApiToken).toBe(true);

      // Cleanup
      await strapi.documents('admin::api-token').delete({
        documentId: createdToken.documentId,
      });
    });
  });
});
