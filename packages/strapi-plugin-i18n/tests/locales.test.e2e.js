'use strict';

const { omit } = require('lodash/fp');

const { createStrapiInstance } = require('../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../test/helpers/request');

const data = {
  locales: [],
  deletedLocales: [],
};

const omitTimestamps = omit(['updatedAt', 'createdAt', 'updated_at', 'created_at']);
const compareLocales = (a, b) => (a.code < b.code ? -1 : 1);

describe('CRUD locales', () => {
  let rq;
  let strapi;

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  }, 60000);

  afterAll(async () => {
    await strapi.destroy();
  });

  describe('Default locale', () => {
    test('Default locale is already created', async () => {
      let res = await rq({
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

      let res = await rq({
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

      let res = await rq({
        url: '/i18n/locales',
        method: 'POST',
        body: locale,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        data: {
          isDefault: ['isDefault is a required field'],
          code: ['code is a required field'],
        },
        error: 'Bad Request',
        message: 'ValidationError',
        statusCode: 400,
      });
    });

    test('Cannot create a locale if code already exists', async () => {
      const locale = {
        code: 'fr',
        name: 'random name',
        isDefault: false,
      };

      let res = await rq({
        url: '/i18n/locales',
        method: 'POST',
        body: locale,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({ message: 'This locale already exists' });
    });

    test('Can create a locale even if name already exists', async () => {
      const locale = {
        name: 'French',
        code: 'fr-FR',
        isDefault: false,
      };

      let res = await rq({
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
      const enLocale = res.body.find(locale => locale.code === 'bas');
      const enUsLocale = res.body.find(locale => locale.code === 'en-US');
      expect(enLocale.isDefault).toBe(false);
      expect(enUsLocale.isDefault).toBe(true);

      data.locales.push(enLocale);
      data.locales.push(enUsLocale);
    });
  });

  describe('Read', () => {
    test('Can list the locales', async () => {
      let res = await rq({
        url: '/i18n/locales',
        method: 'GET',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(data.locales.length);
      expect(res.body.sort(compareLocales)).toMatchObject(data.locales.sort(compareLocales));
    });
  });

  describe('Update', () => {
    test('Can update the name of a locale', async () => {
      const localeUpdate = {
        name: 'French update',
        isDefault: false,
      };

      let res = await rq({
        url: `/i18n/locales/${data.locales[0].id}`,
        method: 'PUT',
        body: localeUpdate,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        ...omitTimestamps(data.locales[0]),
        ...localeUpdate,
      });
      data.locales[0] = res.body;
    });

    test('Cannot update the code of a locale (without name)', async () => {
      const localeUpdate = {
        code: 'ak',
      };

      let res = await rq({
        url: `/i18n/locales/${data.locales[0].id}`,
        method: 'PUT',
        body: localeUpdate,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        data: {
          undefined: ['this field has unspecified keys: code'],
        },
        error: 'Bad Request',
        message: 'ValidationError',
        statusCode: 400,
      });
    });

    test('Cannot update the code of a locale (with name)', async () => {
      const localeUpdate = {
        name: 'French',
        code: 'ak',
      };

      let res = await rq({
        url: `/i18n/locales/${data.locales[0].id}`,
        method: 'PUT',
        body: localeUpdate,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        data: {
          undefined: ['this field has unspecified keys: code'],
        },
        error: 'Bad Request',
        message: 'ValidationError',
        statusCode: 400,
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
      expect(res.body.find(locale => locale.code === data.locales[0].code).isDefault).toBe(false);
      expect(res.body.find(locale => locale.code === data.locales[1].code).isDefault).toBe(true);
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
      expect(res.body.message).toBe('Cannot delete the default locale');
    });

    test('Can delete a locale', async () => {
      const res = await rq({
        url: `/i18n/locales/${data.locales[1].id}`,
        method: 'DELETE',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(omitTimestamps(data.locales[1]));
      data.deletedLocales.push(res.body);
      data.locales.splice(1, 1);
    });

    test('Cannot delete not found locale', async () => {
      let res = await rq({
        url: `/i18n/locales/${data.deletedLocales[0].id}`,
        method: 'DELETE',
      });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('locale.notFound');
    });
  });
});
