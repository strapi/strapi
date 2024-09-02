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
    'discardDraft',
    'count',
  ];

  describe.each(methods)('%s method', (methodName) => {
    describe('sort', () => {
      it('should not throw on existing attribute name', async () => {
        await strapi.documents(ARTICLE_UID)[methodName]({ sort: 'title' });
      });

      it('should not throw on private attribute', async () => {
        await strapi.documents(ARTICLE_UID)[methodName]({ sort: 'private' });
      });

      it('should not throw on password attribute', async () => {
        await strapi.documents(ARTICLE_UID)[methodName]({ sort: 'password' });
      });

      it('should not throw on existing nested (object) key', async () => {
        await strapi.documents(ARTICLE_UID)[methodName]({
          populate: { categories: { sort: { name: 'asc' } } },
        });
      });

      it('should not throw on existing nested (dot separated) key', async () => {
        await strapi.documents(ARTICLE_UID)[methodName]({
          sort: 'categories.name',
          populate: 'categories',
        });
      });

      it('should throw ValidationError on invalid key', async () => {
        await expect(
          strapi.documents(ARTICLE_UID)[methodName]({ sort: 'fakekey' })
        ).rejects.toThrow(errors.ValidationError);
      });
    });

    describe('filters', () => {
      it('should not throw on existing attribute equality', async () => {
        await strapi.documents(ARTICLE_UID)[methodName]({
          filters: {
            title: 'Hello World',
          },
        });
      });

      it('should not throw on private attribute', async () => {
        await strapi.documents(ARTICLE_UID)[methodName]({
          filters: {
            private: 'Hello World',
          },
        });
      });

      it('should not throw on password attribute', async () => {
        await strapi.documents(ARTICLE_UID)[methodName]({
          filters: {
            password: 'Hello World',
          },
        });
      });

      it('should not throw on existing nested conditions', async () => {
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

      it('should throw ValidationError on invalid key', async () => {
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
      it('should not throw on existing attribute equality', async () => {
        await strapi.documents(ARTICLE_UID)[methodName]({
          fields: ['title'],
        });
      });

      it('should not throw on private attribute', async () => {
        await strapi.documents(ARTICLE_UID)[methodName]({
          fields: ['private'],
        });
      });

      it('should not throw on password attribute', async () => {
        await strapi.documents(ARTICLE_UID)[methodName]({
          fields: ['password'],
        });
      });

      it('should throw ValidationError on invalid key', async () => {
        await expect(
          strapi.documents(ARTICLE_UID)[methodName]({
            fields: ['title', 'fakekey'],
          })
        ).rejects.toThrow(errors.ValidationError);
      });

      it('should not throw on valid comma separated keys', async () => {
        await strapi.documents(ARTICLE_UID)[methodName]({ fields: 'title,password,private' });
      });

      it('should throw on invalid comma separated keys', async () => {
        await expect(
          strapi.documents(ARTICLE_UID)[methodName]({ fields: 'title,invalid' })
        ).rejects.toThrow(errors.ValidationError);
      });
    });

    describe('populate', () => {
      it('should not throw on populatable attribute', async () => {
        await strapi.documents(ARTICLE_UID)[methodName]({
          populate: ['categories'],
        });
      });

      it('should not throw on private attribute', async () => {
        await strapi.documents(ARTICLE_UID)[methodName]({
          populate: ['categories_private'],
        });
      });

      it('should not throw on wildcard *', async () => {
        await strapi.documents(ARTICLE_UID)[methodName]({
          populate: '*',
        });
      });

      it('should not throw on dz (boolean)', async () => {
        await strapi.documents(ARTICLE_UID)[methodName]({
          populate: {
            identifiersDz: true,
          },
        });
      });

      it('should not throw on dz - comp (boolean)', async () => {
        await strapi.documents(ARTICLE_UID)[methodName]({
          populate: {
            identifiersDz: {
              on: {
                'article.compo-unique-all': true,
              },
            },
          },
        });
      });

      it('should not throw on dz', async () => {
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

      it('should not throw on nested wildcard populate', async () => {
        await strapi.documents(ARTICLE_UID)[methodName]({
          populate: {
            identifiersDz: {
              on: {
                'article.compo-unique-all': {
                  populate: '*',
                },
              },
            },
          },
        });
      });

      // TODO: functionality is not yet implemented
      it('should throw ValidationError on invalid dz component', async () => {
        await expect(
          strapi.documents(ARTICLE_UID)[methodName]({
            populate: {
              identifiersDz: {
                on: {
                  invalidkey: true,
                },
              },
            },
          })
        ).rejects.toThrow(errors.ValidationError);
      });

      it('should throw ValidationError on non-populatable attribute', async () => {
        await expect(
          strapi.documents(ARTICLE_UID)[methodName]({
            populate: ['title'],
          })
        ).rejects.toThrow(errors.ValidationError);
      });

      it('should throw ValidationError on invalid key', async () => {
        await expect(
          strapi.documents(ARTICLE_UID)[methodName]({
            populate: ['categories', 'fakekey'],
          })
        ).rejects.toThrow(errors.ValidationError);
      });
    });
  });
});
