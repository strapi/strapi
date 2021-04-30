'use strict';

const { createTestBuilder } = require('../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../test/helpers/request');

const builder = createTestBuilder();
let strapi;
let rq;
let localeId;
const model = 'recipe';

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

describe('Update entries in different locales', () => {
  beforeAll(async () => {
    await builder.addContentType(recipeModel).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    const locale = await strapi.query('locale', 'i18n').create({
      code: 'fr',
      name: 'French',
    });

    const enRecipe = await strapi.entityService.create(
      { data: { name: 'Onion soup', locale: 'en' } },
      { model }
    );
    await strapi.entityService.create(
      { data: { name: 'Onion soup', locale: 'fr', localizations: [enRecipe.id] } },
      { model }
    );

    localeId = locale.id;
  });

  afterAll(async () => {
    await strapi.query('locale', 'i18n').delete({ id: localeId });
    await strapi.query('recipe').delete();
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Single-Type', () => {
    test('Can update an entry in default locale (locale not specified)', async () => {
      const res = await rq({
        method: 'PUT',
        url: '/content-manager/single-types/application::recipe.recipe',
        body: { name: 'Best onion soup' },
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        name: 'Best onion soup',
        locale: 'en',
        localizations: [{ locale: 'fr' }],
      });
    });

    test('Can update an entry in default locale (locale specified)', async () => {
      const res = await rq({
        method: 'PUT',
        url: '/content-manager/single-types/application::recipe.recipe',
        body: { name: 'Best onion soup' },
        qs: { plugins: { i18n: { locale: 'en' } } },
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        name: 'Best onion soup',
        locale: 'en',
        localizations: [{ locale: 'fr' }],
      });
    });

    test('Can update an entry in "FR"', async () => {
      const res = await rq({
        method: 'PUT',
        url: '/content-manager/single-types/application::recipe.recipe',
        body: { name: 'Best onion soup' },
        qs: { plugins: { i18n: { locale: 'fr' } } },
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        name: 'Best onion soup',
        locale: 'fr',
        localizations: [{ locale: 'en' }],
      });
    });

    test('Cannot update locale', async () => {
      const res = await rq({
        method: 'PUT',
        url: '/content-manager/single-types/application::recipe.recipe',
        qs: { plugins: { i18n: { locale: 'en' } } },
        body: { name: 'Best onion soup update', locale: 'fr' },
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        name: 'Best onion soup update',
        locale: 'en',
        localizations: [{ locale: 'fr' }],
      });
    });

    test('Cannot update localizations', async () => {
      const res = await rq({
        method: 'PUT',
        url: '/content-manager/single-types/application::recipe.recipe',
        qs: { plugins: { i18n: { locale: 'en' } } },
        body: { name: 'Best onion soup', localizations: [1] },
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        name: 'Best onion soup',
        locale: 'en',
        localizations: [{ locale: 'fr' }],
      });
    });
  });
});
