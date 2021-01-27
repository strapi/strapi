'use strict';

const { omit } = require('lodash/fp');

const { createStrapiInstance } = require('../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../test/helpers/request');

const data = {
  locales: [],
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

  describe('Creation', () => {
    test('Can create a locale', async () => {
      const locale = {
        name: 'French',
        code: 'fr',
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

    test('Can create a locale if name is missing', async () => {
      const locale = {
        code: 'en',
      };

      let res = await rq({
        url: '/i18n/locales',
        method: 'POST',
        body: locale,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        id: expect.anything(),
        name: null,
        code: 'en',
      });
      data.locales.push(res.body);
    });

    test('Cannot create a locale if code is missing', async () => {
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
        data: { code: ['code is a required field'] },
        error: 'Bad Request',
        message: 'ValidationError',
        statusCode: 400,
      });
    });

    test('Cannot create a locale if code already exists', async () => {
      const locale = {
        code: 'fr',
        name: 'random name',
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
  });

  describe('Update', () => {
    test('Can update the name of a locale', async () => {
      const localeUpdate = {
        name: 'French update',
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
          name: ['name is a required field'],
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
});
