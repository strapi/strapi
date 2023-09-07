'use strict';

const fs = require('fs');
const path = require('path');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest, createRequest } = require('api-tests/request');
const { createUtils } = require('api-tests/utils');

const builder = createTestBuilder();

let strapi;
let file;
let contentAPIRequest;
let adminRequest;
let adminUser;
let utils;

const schemas = {
  contentTypes: {
    a: {
      kind: 'collectionType',
      displayName: 'a',
      singularName: 'a',
      pluralName: 'as',
      attributes: {
        cover: { type: 'media' },
      },
    },
    b: {
      kind: 'collectionType',
      displayName: 'b',
      singularName: 'b',
      pluralName: 'bs',
      attributes: {
        name: { type: 'string' },
        number: { type: 'integer' },
        restricted: { type: 'string', private: true },
        password: { type: 'password' },
        relA: { type: 'relation', relation: 'oneToOne', target: 'api::a.a' },
        cp: { type: 'component', repeatable: false, component: 'default.cp-a' },
        dz: { type: 'dynamiczone', components: ['default.cp-a', 'default.cp-b'] },
        img: { type: 'media', multiple: false },
      },
    },
  },
  components: {
    cpA: {
      displayName: 'cp-a',
      attributes: {
        name: {
          type: 'string',
        },
      },
    },
    cpB: {
      displayName: 'cp-b',
      attributes: {
        title: {
          type: 'string',
        },
      },
    },
  },
};

const fixtures = {
  a: (file) => [{ cover: file.id }],
  b:
    (file) =>
    ({ a }) =>
      [
        {
          name: 'one',
          number: 1,
          restricted: 'restricted',
          password: 'password',
          relA: a[0].id,
          cp: { name: 'cp_one' },
          dz: [
            { __component: 'default.cp-a', name: 'cp_two' },
            { __component: 'default.cp-b', title: 'cp_three' },
          ],
          img: file.id,
        },
      ],
};

const uploadFile = async () => {
  const strapi = await createStrapiInstance();
  const rq = await createAuthRequest({ strapi });

  const res = await rq({
    method: 'POST',
    url: '/upload',
    formData: {
      files: fs.createReadStream(path.join(__dirname, 'rec.jpg')),
    },
  });

  await strapi.destroy();

  return res.body[0];
};

/**
 * Create a full access token to authenticate the content API with
 */
const getFullAccessToken = async () => {
  const res = await adminRequest.post('/admin/api-tokens', {
    body: {
      lifespan: null,
      description: '',
      type: 'full-access',
      name: 'Full Access',
      permissions: null,
    },
  });

  return res.body.data.accessKey;
};

describe('Sanitize populated entries', () => {
  beforeAll(async () => {
    file = await uploadFile();

    await builder
      .addComponent(schemas.components.cpA)
      .addComponent(schemas.components.cpB)
      .addContentTypes(Object.values(schemas.contentTypes))
      .addFixtures(schemas.contentTypes.a.singularName, fixtures.a(file))
      .addFixtures(schemas.contentTypes.b.singularName, fixtures.b(file))
      .build();

    strapi = await createStrapiInstance({ bypassAuth: false });

    adminRequest = await createAuthRequest({ strapi });

    contentAPIRequest = createRequest({ strapi })
      .setURLPrefix('/api')
      .setToken(await getFullAccessToken());

    utils = createUtils(strapi);

    const userInfo = {
      email: 'test@strapi.io',
      firstname: 'admin',
      lastname: 'user',
      username: 'test',
      registrationToken: 'foobar',
      password: 'test1234',
      roles: [await utils.getSuperAdminRole()],
    };

    adminUser = await utils.createUser(userInfo);
  });

  afterAll(async () => {
    await utils.deleteUserById(adminUser.id);
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Populate simple media', () => {
    test('Media can be populated without restricted attributes', async () => {
      const { status, body } = await contentAPIRequest.get(
        `/${schemas.contentTypes.a.pluralName}`,
        {
          qs: {
            populate: {
              cover: {
                populate: '*',
              },
            },
          },
        }
      );

      expect(status).toBe(200);
      expect(body.data[0].attributes.cover).toBeDefined();
      expect(body.data[0].attributes.cover.data.attributes.createdBy).toBeUndefined();
      expect(body.data[0].attributes.cover.data.attributes.updatedBy).toBeUndefined();
    });

    test("Media's relations (from related) can be populated without restricted attributes", async () => {
      const { status, body } = await contentAPIRequest.get(`/upload/files/${file.id}`, {
        qs: { populate: { related: { populate: '*' } } },
      });

      expect(status).toBe(200);
      expect(body.related).toBeDefined();
      expect(Array.isArray(body.related)).toBeTruthy();
      expect(body.related).toHaveLength(2);

      const [a, b] = body.related;

      expect(a.__type).toBe('api::a.a');
      expect(b.__type).toBe('api::b.b');

      expect(b).not.toHaveProperty('restricted');
      expect(b).not.toHaveProperty('password');
    });
  });

  describe('Wildcard Populate', () => {
    test('Wildcard populate is transformed to an exhaustive list of populatable fields', async () => {
      const findManyMock = jest.spyOn(strapi.entityService, 'findMany');

      const { status } = await contentAPIRequest.get(`/${schemas.contentTypes.b.pluralName}`, {
        qs: { fields: ['id'], populate: '*' },
      });

      expect(status).toBe(200);
      // Make sure the wildcard populate is transformed to an exhaustive list
      expect(findManyMock).toHaveBeenCalledWith(
        'api::b.b',
        expect.objectContaining({
          populate: expect.objectContaining({ relA: true, cp: true, dz: true, img: true }),
        })
      );
    });
  });

  describe('Correctly sanitize private fields of assignees', () => {
    beforeAll(async () => {
      // Assign the content type b to a review workflow
      await adminRequest.put('/admin/review-workflows/workflows/1', {
        body: {
          data: {
            id: 1,
            name: 'Default',
            contentTypes: ['api::b.b'],
          },
        },
      });

      // Assign the admin user to entry 1 of content type b
      await adminRequest.put(`/admin/content-manager/collection-types/api::b.b/1/assignee`, {
        body: { data: { id: adminUser.id } },
      });
    });

    test('Correctly sanitizes private fields of assignees', async () => {
      const assigneeAttribute = 'strapi_assignee';

      const { status, body } = await contentAPIRequest.get(
        `/${schemas.contentTypes.b.pluralName}`,
        {
          qs: { populate: assigneeAttribute },
        }
      );

      expect(status).toBe(200);

      const privateUserFields = [
        'password',
        'email',
        'resetPasswordToken',
        'registrationToken',
        'isActive',
        'roles',
        'blocked',
      ];

      // Assert that every assignee returned is sanitized correctly
      body.data.forEach((item) => {
        expect(item.attributes).toHaveProperty(assigneeAttribute);
        privateUserFields.forEach((field) => {
          expect(item.attributes[assigneeAttribute]).not.toHaveProperty(field);
        });
      });
    });
  });
});
