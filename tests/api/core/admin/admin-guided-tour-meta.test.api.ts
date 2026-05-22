import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createTestBuilder } from 'api-tests/builder';
import { Core } from '@strapi/types';

const articleContentType = {
  collectionName: 'article',
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

let authRq;
let strapi: Core.Strapi;
const builder = createTestBuilder();

describe('Guided Tour Meta', () => {
  beforeAll(async () => {
    await builder.addContentType(articleContentType).build();
    strapi = await createStrapiInstance();
    authRq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('GET /admin/guided-tour-meta', () => {
    test('Returns the guided tour meta', async () => {
      const res = await authRq({
        url: '/admin/guided-tour-meta',
        method: 'GET',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.isFirstSuperAdminUser).toBe(true);
      expect(Object.keys(res.body.data.schemas)).toContain('api::article.article');

      const newUser = {
        email: 'second@user.com',
        firstname: 'second',
        lastname: 'user',
        password: 'second123',
        roles: [1],
        isActive: true,
      };
      await strapi.db.query('admin::user').create({ data: newUser });
      const request = await createAuthRequest({
        strapi,
        userInfo: newUser,
      });

      const secondSuperAdminUserResponse = await request({
        url: '/admin/guided-tour-meta',
        method: 'GET',
      });

      expect(secondSuperAdminUserResponse.status).toBe(200);
      expect(secondSuperAdminUserResponse.body.data.isFirstSuperAdminUser).toBe(false);
    });
  });
});
