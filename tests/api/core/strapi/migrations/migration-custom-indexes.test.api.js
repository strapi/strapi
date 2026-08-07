'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;

const modelWithIndexedAttributes = {
  kind: 'collectionType',
  displayName: 'Indexed Entry',
  singularName: 'indexed-entry',
  pluralName: 'indexed-entries',
  draftAndPublish: false,
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  indexes: [
    { type: 'index', attributes: ['title'] },
    { type: 'index', attributes: ['slug'] },
  ],
  attributes: {
    title: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    slug: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
  },
};

const createEntry = async (uid, body, locale = 'en') => {
  return rq({
    method: 'POST',
    url: `/content-manager/collection-types/${uid}`,
    qs: { locale },
    body: { ...body, locale },
  });
};

describe('Migration - custom schema indexes (attribute.indexed)', () => {
  beforeAll(async () => {
    await builder
      .addContentTypes([modelWithIndexedAttributes])
      .addFixtures('plugin::i18n.locale', [{ name: 'French', code: 'fr' }])
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('app runs with attribute.indexed and entries can be created', async () => {
    const uid = 'api::indexed-entry.indexed-entry';
    const res = await createEntry(uid, { title: 'First', slug: 'first' }, 'en');
    expect(res.statusCode).toBe(201);
    const res2 = await createEntry(uid, { title: 'Second', slug: 'second' }, 'en');
    expect(res2.statusCode).toBe(201);
    const res3 = await createEntry(uid, { title: 'Same title', slug: 'other' }, 'fr');
    expect(res3.statusCode).toBe(201);
  });
});
