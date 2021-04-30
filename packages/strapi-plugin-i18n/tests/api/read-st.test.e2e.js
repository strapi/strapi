'use strict';

const { createTestBuilder } = require('../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../test/helpers/request');

const builder = createTestBuilder();
let strapi;
let rq;
let localeId;

const recipeModel = {
  kind: 'singleType',
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
  name: 'recipe',
  description: '',
  collectionName: '',
};

describe('Read entries in different locales', () => {
  beforeAll(async () => {
    await builder.addContentType(recipeModel).build();

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
    await strapi.query('recipe').delete();
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Single-Type', () => {
    test("Cannot read an entry that doesn't exist (locale not specified)", async () => {
      const res = await rq({
        method: 'GET',
        url: '/recipe',
      });

      expect(res.status).toBe(404);
    });

    test("Cannot read an entry that doesn't exist (locale specified)", async () => {
      const res = await rq({
        method: 'GET',
        url: '/recipe',
        qs: { _locale: 'en' },
      });

      expect(res.status).toBe(404);
    });

    test('Can read an entry in default locale (locale not specified)', async () => {
      await strapi.entityService.create(
        { data: { name: 'Onion soup', locale: 'en' } },
        { model: 'recipe' }
      );

      const res = await rq({
        method: 'GET',
        url: '/recipe',
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ name: 'Onion soup', locale: 'en', localizations: [] });
    });

    test('Can read an entry in default locale (locale specified)', async () => {
      const res = await rq({
        method: 'GET',
        url: '/recipe',
        qs: { _locale: 'en' },
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ name: 'Onion soup', locale: 'en', localizations: [] });
    });

    test('Can read an entry in "fr"', async () => {
      await rq({
        method: 'POST',
        url: '/recipe/localizations',
        body: { name: 'Onion soup', locale: 'fr' },
      });

      const res = await rq({
        method: 'GET',
        url: '/recipe',
        qs: { _locale: 'fr' },
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        name: 'Onion soup',
        locale: 'fr',
        localizations: [{ locale: 'en' }],
      });
    });
  });
});
