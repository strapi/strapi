'use strict';

const { omit } = require('lodash/fp');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const data = {
  locales: [],
  deletedLocales: [],
};

const omitTimestamps = omit(['updatedAt', 'createdAt']);
const compareLocales = (a, b) => (a.code < b.code ? -1 : 1);

const productModel = {
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    name: {
      type: 'string',
    },
  },
  displayName: 'Product',
  singularName: 'product',
  pluralName: 'products',
  description: '',
  collectionName: '',
};

describe('CRUD locales', () => {
  let rq;
  let strapi;
  const builder = createTestBuilder();
  let localeService;

  beforeAll(async () => {
    await builder.addContentType(productModel).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    localeService = strapi.plugin('i18n').service('locales');

    // ensure we don't have any data in the database left over from previous tests that didn't clean up
    await strapi.db.query('api::product.product').deleteMany();
  });

  afterAll(async () => {
    await localeService.setDefaultLocale({ code: 'en' });

    // Delete all data that has been created
    await strapi.db.query('plugin::i18n.locale').deleteMany({ code: { $ne: 'en' } });
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Default locale', () => {
    test('Default locale is already created', async () => {
      const res = await rq({
        url: '/i18n/locales',
        method: 'GET',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].isDefault).toBe(true);
      data.locales.push(res.body[0]);
    });
  });

  describe('Creation', () => {
    test('Can create a locale', async () => {
      const locale = {
        name: 'French',
        code: 'fr',
        isDefault: false,
      };

      const res = await rq({
        url: '/i18n/locales',
        method: 'POST',
        body: locale,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        id: expect.anything(),
        ...locale,
      });
      data.locales.push(res.body);
    });

    test('Cannot create a locale if code or isDefault is missing', async () => {
      const locale = {
        name: 'Italian',
      };

      const res = await rq({
        url: '/i18n/locales',
        method: 'POST',
        body: locale,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        data: null,
        error: {
          details: {
            errors: [
              {
                message: 'code is a required field',
                name: 'ValidationError',
                path: ['code'],
              },
              {
                message: 'isDefault is a required field',
                name: 'ValidationError',
                path: ['isDefault'],
              },
            ],
          },
          message: '2 errors occurred',
          name: 'ValidationError',
          status: 400,
        },
      });
    });

    test('Cannot create a locale if code already exists', async () => {
      const locale = {
        code: 'fr',
        name: 'random name',
        isDefault: false,
      };

      const res = await rq({
        url: '/i18n/locales',
        method: 'POST',
        body: locale,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        data: null,
        error: {
          status: 400,
          name: 'ApplicationError',
          message: 'This locale already exists',
          details: {},
        },
      });
    });

    test('Can create a locale even if name already exists', async () => {
      const locale = {
        name: 'French',
        code: 'fr-FR',
        isDefault: false,
      };

      const res = await rq({
        url: '/i18n/locales',
        method: 'POST',
        body: locale,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        id: expect.anything(),
        ...locale,
      });
      data.locales.push(res.body);
    });

    test('Only one locale can be default (POST)', async () => {
      let res = await rq({
        url: '/i18n/locales',
        method: 'POST',
        body: { code: 'bas', name: 'random', isDefault: true },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.isDefault).toBe(true);
      data.locales[0].isDefault = false;

      res = await rq({
        url: '/i18n/locales',
        method: 'POST',
        body: { code: 'en-US', name: 'random', isDefault: true },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.isDefault).toBe(true);

      res = await rq({
        url: '/i18n/locales',
        method: 'GET',
      });

      expect(res.statusCode).toBe(200);
      const enLocale = res.body.find((locale) => locale.code === 'bas');
      const enUsLocale = res.body.find((locale) => locale.code === 'en-US');
      expect(enLocale.isDefault).toBe(false);
      expect(enUsLocale.isDefault).toBe(true);

      data.locales.push(enLocale);
      data.locales.push(enUsLocale);
    });
  });

  describe('Read', () => {
    test('Can list the locales', async () => {
      const res = await rq({
        url: '/i18n/locales',
        method: 'GET',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(data.locales.length);
      expect(res.body.sort(compareLocales)).toMatchObject(
        data.locales.slice().sort(compareLocales)
      );
    });
  });

  describe('Update', () => {
    test('Can update the name of a locale', async () => {
      const localeUpdate = {
        name: 'French update',
        isDefault: false,
      };

      const res = await rq({
        url: `/i18n/locales/${data.locales[1].id}`,
        method: 'PUT',
        body: localeUpdate,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        ...omitTimestamps(data.locales[1]),
        ...localeUpdate,
      });
      data.locales[1] = res.body;
    });

    test('Cannot update the code of a locale (without name)', async () => {
      const localeUpdate = {
        code: 'ak',
      };

      const res = await rq({
        url: `/i18n/locales/${data.locales[0].id}`,
        method: 'PUT',
        body: localeUpdate,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        data: null,
        error: {
          details: {
            errors: [
              {
                path: [],
                name: 'ValidationError',
                message: 'this field has unspecified keys: code',
              },
            ],
          },
          message: 'this field has unspecified keys: code',
          name: 'ValidationError',
          status: 400,
        },
      });
    });

    test('Cannot update the code of a locale (with name)', async () => {
      const localeUpdate = {
        name: 'French',
        code: 'ak',
      };

      const res = await rq({
        url: `/i18n/locales/${data.locales[0].id}`,
        method: 'PUT',
        body: localeUpdate,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        data: null,
        error: {
          details: {
            errors: [
              {
                path: [],
                name: 'ValidationError',
                message: 'this field has unspecified keys: code',
              },
            ],
          },
          message: 'this field has unspecified keys: code',
          name: 'ValidationError',
          status: 400,
        },
      });
    });

    test('Only one locale can be default (PUT)', async () => {
      let res = await rq({
        url: `/i18n/locales/${data.locales[0].id}`,
        method: 'PUT',
        body: { isDefault: true },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.isDefault).toBe(true);

      res = await rq({
        url: `/i18n/locales/${data.locales[1].id}`,
        method: 'PUT',
        body: { isDefault: true },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.isDefault).toBe(true);

      res = await rq({
        url: '/i18n/locales',
        method: 'GET',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.find((locale) => locale.code === data.locales[0].code).isDefault).toBe(false);
      expect(res.body.find((locale) => locale.code === data.locales[1].code).isDefault).toBe(true);
    });

    test('Cannot unselect isDefault', async () => {
      let res = await rq({
        url: `/i18n/locales/${data.locales[0].id}`,
        method: 'PUT',
        body: { isDefault: true },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.isDefault).toBe(true);

      res = await rq({
        url: `/i18n/locales/${data.locales[0].id}`,
        method: 'PUT',
        body: { isDefault: false },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.isDefault).toBe(true);
    });
  });

  describe('Delete', () => {
    test('Cannot delete default locale', async () => {
      let res = await rq({
        url: `/i18n/locales/${data.locales[0].id}`,
        method: 'PUT',
        body: { isDefault: true },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.isDefault).toBe(true);
      data.locales[1].isDefault = false;

      res = await rq({
        url: `/i18n/locales/${data.locales[0].id}`,
        method: 'DELETE',
      });
      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        data: null,
        error: {
          status: 400,
          name: 'ApplicationError',
          message: 'Cannot delete the default locale',
          details: {},
        },
      });
    });

    test('Simply delete a locale', async () => {
      const res = await rq({
        url: `/i18n/locales/${data.locales[1].id}`,
        method: 'DELETE',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(omitTimestamps(data.locales[1]));
      data.deletedLocales.push(res.body);
      data.locales.splice(1, 1);
    });

    test('Delete a locale and entities in this locale', async () => {
      const {
        body: { data: frenchProduct },
      } = await rq({
        url: '/content-manager/collection-types/api::product.product',
        method: 'POST',
        qs: { locale: 'fr-FR' },
        body: { name: 'product name' },
      });

      await rq({
        url: `/content-manager/collection-types/api::product.product/${frenchProduct.documentId}`,
        method: 'PUT',
        body: { name: 'product name' },
        qs: {
          locale: 'en',
        },
      });

      const {
        body: { results: createdProducts },
      } = await rq({
        url: '/content-manager/collection-types/api::product.product',
        method: 'GET',
        qs: { locale: 'fr-FR' },
      });

      expect(createdProducts).toHaveLength(1);
      // expect(createdProducts[0].localizations[0].locale).toBe('en');

      const res = await rq({
        url: `/i18n/locales/${data.locales[1].id}`,
        method: 'DELETE',
      });

      const {
        body: { results: frenchProducts },
      } = await rq({
        url: '/content-manager/collection-types/api::product.product',
        method: 'GET',
        qs: { locale: 'fr-FR' },
      });
      expect(frenchProducts).toHaveLength(0);

      const {
        body: { results: englishProducts },
      } = await rq({
        url: '/content-manager/collection-types/api::product.product',
        method: 'GET',
        qs: { locale: 'en' },
      });
      expect(englishProducts).toHaveLength(1);

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(omitTimestamps(data.locales[1]));
      data.deletedLocales.push(res.body);
      data.locales.splice(1, 1);
    });

    test('Cannot delete not found locale', async () => {
      const res = await rq({
        url: `/i18n/locales/${data.deletedLocales[0].id}`,
        method: 'DELETE',
      });

      expect(res.statusCode).toBe(404);
      expect(res.body).toMatchObject({
        data: null,
        error: {
          status: 404,
          name: 'NotFoundError',
          message: 'locale.notFound',
          details: {},
        },
      });
    });
  });
});
