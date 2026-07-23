'use strict';

// Repro for https://github.com/strapi/strapi/issues/26238
// Single-row delete via the Content Manager returns 404 for a non-i18n
// collection type when a locale query param is present, because findLocales
// filters `where.locale = <locale>` while non-i18n rows have `locale = null`.

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;

const model = {
  draftAndPublish: true,
  pluginOptions: {}, // non-i18n (not localized)
  singularName: 'errorcode',
  pluralName: 'errorcodes',
  displayName: 'Errorcode',
  attributes: {
    code: { type: 'string' },
  },
};

const uid = 'api::errorcode.errorcode';

describe('CM single-row delete for non-i18n type with locale param (#26238)', () => {
  beforeAll(async () => {
    await builder.addContentType(model).build();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  const createEntry = async () => {
    const { body } = await rq({
      url: `/content-manager/collection-types/${uid}`,
      method: 'POST',
      body: { code: 'E-001' },
    });
    return body.data;
  };

  test('deletes without a locale param (baseline)', async () => {
    const entry = await createEntry();
    const res = await rq({
      url: `/content-manager/collection-types/${uid}/${entry.documentId}`,
      method: 'DELETE',
    });
    expect(res.statusCode).toBe(200);
  });

  test('deletes even when a locale query param is passed', async () => {
    const entry = await createEntry();
    const res = await rq({
      url: `/content-manager/collection-types/${uid}/${entry.documentId}`,
      method: 'DELETE',
      qs: { locale: 'en' },
    });

    // Bug: returned 404 because findLocales matched nothing for a null-locale row.
    expect(res.statusCode).toBe(200);

    // The entry is actually gone.
    const getRes = await rq({
      url: `/content-manager/collection-types/${uid}/${entry.documentId}`,
      method: 'GET',
    });
    expect(getRes.statusCode).toBe(404);
  });
});
