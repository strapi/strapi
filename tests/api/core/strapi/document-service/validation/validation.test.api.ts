import type { Core, Modules } from '@strapi/types';
import { errors } from '@strapi/utils';
import { createTestSetup, destroyTestSetup } from '../../../../utils/builder-helper';
import resources from '../resources/index';
import { ARTICLE_UID } from '../utils';

let strapi: Core.Strapi;

describe('Document Service Validations', () => {
  let testUtils;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  const methods = [
    'findMany',
    'findFirst',
    'findOne',
    'publish',
    'delete',
    'create',
    'unpublish',
    'clone',
    'update',
  ];

  describe('sort', () => {
    test.todo('should not throw on private fields');

    test.each(methods)('%s should not throw on existing attribute name', async (methodName) => {
      await strapi.documents(ARTICLE_UID)[methodName]({ sort: 'title' });
    });

    test.each(methods)(
      '%s should not throw on existing nested (object) key',
      async (methodName) => {
        await strapi
          .documents(ARTICLE_UID)
          [methodName]({ populate: { categories: { sort: { name: 'asc' } } } });
      }
    );

    test.each(methods)(
      '%s should not throw on existing nested (dot separated) key',
      async (methodName) => {
        await strapi
          .documents(ARTICLE_UID)
          [methodName]({ sort: 'categories.name', populate: 'categories' });
      }
    );

    test.each(methods)('%s should throw ValidationError on invalid key', async (methodName) => {
      await expect(strapi.documents(ARTICLE_UID)[methodName]({ sort: 'fakekey' })).rejects.toThrow(
        errors.ValidationError
      );
    });
  });

  describe('filters', () => {
    test.each(methods)('%s should not throw on existing attribute equality', async (methodName) => {
      await strapi.documents(ARTICLE_UID)[methodName]({
        filters: {
          title: 'Hello World',
        },
      });
    });

    test.each(methods)('%s should not throw on existing nested conditions', async (methodName) => {
      await strapi.documents(ARTICLE_UID)[methodName]({
        filters: {
          title: {
            $not: {
              $contains: 'Hello World',
            },
          },
        },
      });
    });

    test.each(methods)('%s should throw ValidationError on invalid key', async (methodName) => {
      await expect(
        strapi.documents(ARTICLE_UID)[methodName]({
          filters: {
            fakekey: 'Hello World',
          },
        })
      ).rejects.toThrow(errors.ValidationError);
    });
  });

  describe('fields', () => {
    test.todo('should not throw on private fields');

    test.each(methods)('%s should not throw on existing attribute equality', async (methodName) => {
      await strapi.documents(ARTICLE_UID)[methodName]({
        fields: ['title'],
      });
    });

    test.each(methods)('%s should throw ValidationError on invalid key', async (methodName) => {
      await expect(
        strapi.documents(ARTICLE_UID)[methodName]({
          fields: ['title', 'fakekey'],
        })
      ).rejects.toThrow(errors.ValidationError);
    });
  });

  describe('populate', () => {
    test.todo('should not throw on private fields');

    test.each(methods)('%s should not throw', async (methodName) => {
      await strapi.documents(ARTICLE_UID)[methodName]({
        populate: ['categories'],
      });
    });

    test.each(methods)('%s should not throw on wildcard *', async (methodName) => {
      await strapi.documents(ARTICLE_UID)[methodName]({
        populate: '*',
      });
    });

    test.each(methods)('%s should not throw on dz', async (methodName) => {
      await strapi.documents(ARTICLE_UID)[methodName]({
        populate: {
          identifiersDz: {
            on: {
              'article.compo-unique-all': {
                fields: ['ComponentTextShort'],
              },
            },
          },
        },
      });
    });

    test.each(methods)('%s should throw ValidationError on invalid key', async (methodName) => {
      await expect(
        strapi.documents(ARTICLE_UID)[methodName]({
          populate: ['categories', 'fakekey'],
        })
      ).rejects.toThrow(errors.ValidationError);
    });
  });
});
