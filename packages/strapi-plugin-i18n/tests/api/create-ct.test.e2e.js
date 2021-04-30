'use strict';

const { createTestBuilder } = require('../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../test/helpers/request');

const builder = createTestBuilder();
let strapi;
let rq;
let localeId;

const recipesModel = {
  attributes: {
    name: {
      type: 'string',
    },
  },
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  connection: 'default',
  name: 'recipes',
  description: '',
  collectionName: '',
};

describe('Create entries in different locales', () => {
  beforeAll(async () => {
    await builder.addContentType(recipesModel).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    const locale = await strapi.query('locale', 'i18n').create({
      code: 'fr',
      name: 'French',
    });

    localeId = locale.id;
  });

  afterAll(async () => {
    await strapi.query('locale', 'i18n').delete({ id: localeId });
    await strapi.query('recipes').delete();
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Collection-Type', () => {
    test('Create an entry in default locale (locale specified)', async () => {
      const res = await rq({
        method: 'POST',
        url: '/recipes',
        body: { name: 'Onion soup', locale: 'en' },
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ name: 'Onion soup', locale: 'en', localizations: [] });
    });

    test('Create an entry in default locale (locale not specified)', async () => {
      const res = await rq({
        method: 'POST',
        url: '/recipes',
        body: { name: 'Onion soup' },
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ name: 'Onion soup', locale: 'en', localizations: [] });
    });

    test('Create an entry in "fr"', async () => {
      const res = await rq({
        method: 'POST',
        url: '/recipes',
        body: { name: 'Onion soup', locale: 'fr' },
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ name: 'Onion soup', locale: 'fr', localizations: [] });
    });

    test('Cannot create an entry in an unknown locale', async () => {
      const res = await rq({
        method: 'POST',
        url: '/recipes',
        body: { name: 'Onion soup', locale: 'unknown-locale' },
      });

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        error: 'Bad Request',
        message: "This locale doesn't exist",
        statusCode: 400,
      });
    });

    test.skip('Cannot create an entry with localizations', async () => {
      const res = await rq({
        method: 'POST',
        url: '/recipes',
        body: { name: 'Onion soup', locale: 'en', localizations: [localeId] }, // random id
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ name: 'Onion soup', locale: 'en', localizations: [] });
    });
  });
});
