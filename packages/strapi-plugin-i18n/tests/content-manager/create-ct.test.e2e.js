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
        url: '/content-manager/collection-types/application::recipes.recipes',
        qs: { plugins: { i18n: { locale: 'en' } } },
        body: { name: 'Onion soup' },
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ name: 'Onion soup', locale: 'en', localizations: [] });
    });

    test('Create an entry in default locale (locale not specified)', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/application::recipes.recipes',
        body: { name: 'Onion soup' },
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ name: 'Onion soup', locale: 'en', localizations: [] });
    });

    test('Create an entry in "fr"', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/application::recipes.recipes',
        qs: { plugins: { i18n: { locale: 'fr' } } },
        body: { name: 'Onion soup' },
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ name: 'Onion soup', locale: 'fr', localizations: [] });
    });

    test('Cannot create an entry in an unknown locale', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/application::recipes.recipes',
        qs: { plugins: { i18n: { locale: 'unknown-locale' } } },
        body: { name: 'Onion soup' },
      });

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        error: 'Bad Request',
        message: "This locale doesn't exist",
        statusCode: 400,
      });
    });

    test('Cannot create an entry with localizations', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/application::recipes.recipes',
        qs: { plugins: { i18n: { locale: 'en' } } },
        body: { name: 'Onion soup', localizations: [1] },
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ name: 'Onion soup', locale: 'en', localizations: [] });
    });

    test('Cannot create an entry with locale', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/application::recipes.recipes',
        qs: { plugins: { i18n: { locale: 'en' } } },
        body: { name: 'Onion soup', locale: 'fr' },
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ name: 'Onion soup', locale: 'en', localizations: [] });
    });
  });
});
