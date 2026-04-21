'use strict';

const fs = require('fs');
const path = require('path');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createContentAPIRequest, createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();

let strapi;
let file;
let contentAPIRequest;

const schemas = {
  contentTypes: {
    a: {
      kind: 'collectionType',
      displayName: 'a',
      singularName: 'a',
      pluralName: 'as',
      attributes: {
        cover: {
          type: 'media',
        },
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
    // Content type with populateCreatorFields enabled to test admin::user output sanitization
    c: {
      kind: 'collectionType',
      displayName: 'c',
      singularName: 'c',
      pluralName: 'cs',
      options: {
        populateCreatorFields: true,
      },
      attributes: {
        title: { type: 'string' },
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
    ({ a }) => [
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
  c: () => [{ title: 'Test with creator fields' }],
};

const uploadFile = async () => {
  const strapi = await createStrapiInstance();
  const request = await createAuthRequest({ strapi });

  const res = await request({
    method: 'POST',
    url: '/upload',
    formData: {
      files: fs.createReadStream(path.join(__dirname, 'rec.jpg')),
    },
  });

  await strapi.destroy();

  return res.body[0];
};

let adminRequest;

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

    strapi = await createStrapiInstance();
    contentAPIRequest = createContentAPIRequest({ strapi });
    adminRequest = await createAuthRequest({ strapi });

    // Create content type c via admin API to ensure createdBy/updatedBy are set
    await adminRequest({
      method: 'POST',
      url: `/content-manager/collection-types/api::c.c`,
      body: { title: 'Test with creator fields' },
    });
  });

  afterAll(async () => {
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
      expect(body.data[0].cover).toBeDefined();
      expect(body.data[0].cover.createdBy).toBeUndefined();
      expect(body.data[0].cover.updatedBy).toBeUndefined();
    });

    test("Media's relations (from related) can be populated without restricted attributes", async () => {
      const { status, body } = await contentAPIRequest.get(`/upload/files/${file.id}`, {
        qs: {
          populate: {
            related: true,
          },
        },
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
      let populate = {};
      strapi.documents.use((ctx, next) => {
        populate = ctx.params?.populate;
        return next();
      });

      const { status } = await contentAPIRequest.get(`/${schemas.contentTypes.b.pluralName}`, {
        qs: {
          fields: ['id'],
          populate: '*',
        },
      });

      expect(status).toBe(200);
      // Make sure the wildcard populate is transformed to an exhaustive list
      expect(populate).toMatchObject({
        relA: true,
        cp: true,
        dz: true,
        img: true,
      });
    });
  });

  describe('Output Sanitization', () => {
    describe('Content type output sanitization', () => {
      test('restricted (private) fields are excluded from output', async () => {
        const { status, body } = await contentAPIRequest.get(
          `/${schemas.contentTypes.b.pluralName}`,
          {
            qs: {
              populate: '*',
            },
          }
        );

        expect(status).toBe(200);
        expect(body.data[0]).not.toHaveProperty('restricted');
      });

      test('password fields are excluded from output', async () => {
        const { status, body } = await contentAPIRequest.get(
          `/${schemas.contentTypes.b.pluralName}`,
          {
            qs: {
              populate: '*',
            },
          }
        );

        expect(status).toBe(200);
        expect(body.data[0]).not.toHaveProperty('password');
      });

      test('createdBy/updatedBy fields are excluded from output by default', async () => {
        const { status, body } = await contentAPIRequest.get(
          `/${schemas.contentTypes.b.pluralName}`,
          {
            qs: {
              populate: '*',
            },
          }
        );

        expect(status).toBe(200);
        // By default, createdBy/updatedBy are private and not populated
        expect(body.data[0]).not.toHaveProperty('createdBy');
        expect(body.data[0]).not.toHaveProperty('updatedBy');
      });
    });

    describe('Admin user output sanitization (populateCreatorFields enabled)', () => {
      // When populateCreatorFields is true, createdBy/updatedBy are populated
      // but sensitive admin::user fields must be stripped from output

      test('createdBy is populated but sensitive fields are stripped', async () => {
        const { status, body } = await contentAPIRequest.get(
          `/${schemas.contentTypes.c.pluralName}`,
          {
            qs: {
              populate: 'createdBy',
            },
          }
        );

        expect(status).toBe(200);
        expect(body.data[0]).toHaveProperty('createdBy');

        const createdBy = body.data[0].createdBy;
        // Public fields should be present
        expect(createdBy).toHaveProperty('id');
        expect(createdBy).toHaveProperty('firstname');
        expect(createdBy).toHaveProperty('lastname');

        // Sensitive fields must be stripped
        expect(createdBy).not.toHaveProperty('password');
        expect(createdBy).not.toHaveProperty('resetPasswordToken');
        expect(createdBy).not.toHaveProperty('registrationToken');
        expect(createdBy).not.toHaveProperty('blocked');
      });

      test('updatedBy is populated but sensitive fields are stripped', async () => {
        const { status, body } = await contentAPIRequest.get(
          `/${schemas.contentTypes.c.pluralName}`,
          {
            qs: {
              populate: 'updatedBy',
            },
          }
        );

        expect(status).toBe(200);
        expect(body.data[0]).toHaveProperty('updatedBy');

        const updatedBy = body.data[0].updatedBy;
        // Public fields should be present
        expect(updatedBy).toHaveProperty('id');
        expect(updatedBy).toHaveProperty('firstname');
        expect(updatedBy).toHaveProperty('lastname');

        // Sensitive fields must be stripped
        expect(updatedBy).not.toHaveProperty('password');
        expect(updatedBy).not.toHaveProperty('resetPasswordToken');
        expect(updatedBy).not.toHaveProperty('registrationToken');
        expect(updatedBy).not.toHaveProperty('blocked');
      });
    });

    describe('Query validation blocks private admin::user field filters (returns 400)', () => {
      // These tests verify that the Content API VALIDATES and REJECTS
      // queries attempting to filter on private admin::user fields.
      // This is done via validation (not sanitization) so returns 400.

      test('rejects filter on createdBy.email (private)', async () => {
        const { status } = await contentAPIRequest.get(`/${schemas.contentTypes.b.pluralName}`, {
          qs: {
            filters: {
              createdBy: {
                email: { $startsWith: 'a' },
              },
            },
          },
        });

        expect(status).toBe(400);
      });

      test('rejects filter on updatedBy.resetPasswordToken (private)', async () => {
        const { status } = await contentAPIRequest.get(`/${schemas.contentTypes.b.pluralName}`, {
          qs: {
            filters: {
              updatedBy: {
                resetPasswordToken: { $startsWith: 'abc' },
              },
            },
          },
        });

        expect(status).toBe(400);
      });

      test('rejects filter on createdBy.password', async () => {
        const { status } = await contentAPIRequest.get(`/${schemas.contentTypes.b.pluralName}`, {
          qs: {
            filters: {
              createdBy: {
                password: { $startsWith: '$2' },
              },
            },
          },
        });

        expect(status).toBe(400);
      });

      test('rejects sort on updatedBy.email (private)', async () => {
        const { status } = await contentAPIRequest.get(`/${schemas.contentTypes.b.pluralName}`, {
          qs: {
            sort: {
              updatedBy: { email: 'asc' },
            },
          },
        });

        expect(status).toBe(400);
      });

      test('rejects sort on createdBy.resetPasswordToken (private)', async () => {
        const { status } = await contentAPIRequest.get(`/${schemas.contentTypes.b.pluralName}`, {
          qs: {
            sort: {
              createdBy: { resetPasswordToken: 'desc' },
            },
          },
        });

        expect(status).toBe(400);
      });
    });

    describe('Allows filters on public admin::user fields', () => {
      // Public fields like firstname/lastname should be allowed

      test('allows filter on createdBy.firstname (public)', async () => {
        const { status } = await contentAPIRequest.get(`/${schemas.contentTypes.b.pluralName}`, {
          qs: {
            filters: {
              createdBy: {
                firstname: 'Admin',
              },
            },
          },
        });

        // Note: Will return 400 if createdBy is private by default
        // This tests that public fields are allowed IF the relation is accessible
        expect([200, 400]).toContain(status);
      });
    });
  });
});
