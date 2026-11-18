'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');
const { createAuthRequest } = require('api-tests/request');

const RACE_UID = 'api::race.race';

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

const createBarrier = (parties) => {
  let arrived = 0;
  let open = () => {};
  const opened = new Promise((resolve) => {
    open = resolve;
  });

  return async () => {
    arrived += 1;
    if (arrived >= parties) {
      open();
    }
    await opened;
  };
};

describe('parallel locale create', () => {
  let strapi;
  let rq;
  let documentId;
  let barrier;

  beforeAll(async () => {
    await builder.addContentType(model).build();
    strapi = await createStrapiInstance({
      bootstrap({ strapi: s }) {
        // Hold both updates until each one has passed the Content Manager
        // existence checks, so their transactions start together. A barrier
        // after the document lock would wait forever on the blocked writer.
        s.documents.use(async (context, next) => {
          if (barrier && context.uid === RACE_UID && context.action === 'update') {
            await barrier();
          }

          return next();
        });
      },
    });
    rq = await createAuthRequest({ strapi });
    await strapi.plugin('i18n').service('locales').create({ code: 'fr', name: 'French' });

    const created = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${RACE_UID}`,
      body: { name: 'en' },
    });
    documentId = created.body.data.documentId;

    barrier = createBarrier(2);
    const responses = await Promise.all([
      rq({
        method: 'PUT',
        url: `/content-manager/collection-types/${RACE_UID}/${documentId}`,
        qs: { locale: 'fr' },
        body: { name: 'a' },
      }),
      rq({
        method: 'PUT',
        url: `/content-manager/collection-types/${RACE_UID}/${documentId}`,
        qs: { locale: 'fr' },
        body: { name: 'b' },
      }),
    ]);
    barrier = undefined;

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
    const rows = await strapi.db.query(RACE_UID).findMany({
      where: { documentId, locale: 'fr', publishedAt: null },
      select: ['id', 'name'],
    });
    expect(rows).toHaveLength(1);
    expect(['a', 'b']).toContain(rows[0].name);
  });
});
