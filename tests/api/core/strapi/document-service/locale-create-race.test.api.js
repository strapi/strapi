'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
const model = {
  attributes: {
    name: {
      type: 'string',
      pluginOptions: { i18n: { localized: true } },
    },
  },
  draftAndPublish: true,
  displayName: 'Race',
  singularName: 'race',
  pluralName: 'races',
  pluginOptions: { i18n: { localized: true } },
};

describe('parallel locale create', () => {
  let strapi;
  let rq;
  let documentId;

  beforeAll(async () => {
    await builder.addContentType(model).build();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
    await strapi.plugin('i18n').service('locales').create({ code: 'fr', name: 'French' });

    const created = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::race.race',
      body: { name: 'en' },
    });
    documentId = created.body.data.documentId;

    const responses = await Promise.all([
      rq({
        method: 'PUT',
        url: `/content-manager/collection-types/api::race.race/${documentId}`,
        qs: { locale: 'fr' },
        body: { name: 'a' },
      }),
      rq({
        method: 'PUT',
        url: `/content-manager/collection-types/api::race.race/${documentId}`,
        qs: { locale: 'fr' },
        body: { name: 'b' },
      }),
    ]);

    responses.forEach((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 120000);

  afterAll(async () => {
    await strapi.db.query('plugin::i18n.locale').deleteMany({ where: { code: { $ne: 'en' } } });
    await strapi.destroy();
    await builder.cleanup();
  });

  test('creates a single french draft', async () => {
    const rows = await strapi.db.query('api::race.race').findMany({
      where: { documentId, locale: 'fr', publishedAt: null },
      select: ['id', 'name'],
    });
    expect(rows).toHaveLength(1);
    expect(['a', 'b']).toContain(rows[0].name);
  });
});
