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

describe('Create entries in different locales', () => {
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
    test('Create an entry in default locale (locale specified)', async () => {
      const res = await rq({
        method: 'PUT',
        url: '/recipe',
        body: { name: 'Onion soup', locale: 'en' },
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ name: 'Onion soup', locale: 'en', localizations: [] });
      await strapi.query('recipe').delete();
    });

    test('Create an entry in default locale (locale not specified)', async () => {
      const res = await rq({
        method: 'PUT',
        url: '/recipe',
        body: { name: 'Onion soup' },
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ name: 'Onion soup', locale: 'en', localizations: [] });
      await strapi.query('recipe').delete();
    });

    test('Create an entry in "fr"', async () => {
      const res = await rq({
        method: 'PUT',
        url: '/recipe',
        body: { name: 'Onion soup', locale: 'fr' },
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ name: 'Onion soup', locale: 'fr', localizations: [] });
    });

    test('Cannot create an entry if one already exist', async () => {
      const res = await rq({
        method: 'PUT',
        url: '/recipe',
        body: { name: 'Onion soup', locale: 'en' },
      });

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        error: 'Bad Request',
        message: 'singleType.alreadyExists',
        statusCode: 400,
      });
    });

    test('Cannot create an entry with localizations', async () => {
      await strapi.query('recipe').delete();
      const res = await rq({
        method: 'PUT',
        url: '/recipe',
        body: { name: 'Onion soup', locale: 'en', localizations: [localeId] }, // random id
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ name: 'Onion soup', locale: 'en', localizations: [] });
    });
  });
});
