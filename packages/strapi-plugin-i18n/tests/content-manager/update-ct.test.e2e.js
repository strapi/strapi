'use strict';

const { createTestBuilder } = require('../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../test/helpers/request');

const builder = createTestBuilder();
let strapi;
let rq;
let localeId;
const model = 'recipe';
let recipe;

const recipeModel = {
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

    recipe = await strapi.entityService.create(
      { data: { name: 'Onion soup', locale: 'en' } },
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

  describe('Collection-Type', () => {
    test('Cannot update locale', async () => {
      const res = await rq({
        method: 'PUT',
        url: `/content-manager/collection-types/application::recipe.recipe/${recipe.id}`,
        body: { name: 'Best onion soup', locale: 'fr' },
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ name: 'Best onion soup', locale: 'en', localizations: [] });
    });

    test('Cannot update localizations', async () => {
      const res = await rq({
        method: 'PUT',
        url: `/content-manager/collection-types/application::recipe.recipe/${recipe.id}`,
        body: { name: 'Best onion soup', localizations: [1] },
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ name: 'Best onion soup', locale: 'en', localizations: [] });
    });
  });
});
