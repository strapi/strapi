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
});
