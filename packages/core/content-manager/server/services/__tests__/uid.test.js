'use strict';

const uidServiceLoader = require('../uid');

describe('Test uid service', () => {
  describe('generateUIDField', () => {
    test('Uses modelName if no targetField specified or set', async () => {
      const strapi = {
        contentTypes: {
          'my-model': {
            modelName: 'myTestModel',
            attributes: {
              slug: {
                type: 'uid',
              },
            },
          },
        },
        db: {
          query() {
            return {
              findMany: async () => [],
            };
          },
        },
      };
      const uidService = uidServiceLoader({ strapi });

      const uid = await uidService.generateUIDField({
        contentTypeUID: 'my-model',
        field: 'slug',
        data: {},
      });

      expect(uid).toBe('my-test-model');
    });

    test('Calls findUniqueUID', async () => {
      const strapi = {
        contentTypes: {
          'my-model': {
            modelName: 'myTestModel',
            attributes: {
              title: {
                type: 'string',
              },
              slug: {
                type: 'uid',
                targetField: 'title',
              },
            },
          },
        },
        db: {
          query() {
            return {
              findMany: async () => [],
            };
          },
        },
      };
      const uidService = uidServiceLoader({ strapi });
      uidService.findUniqueUID = jest.fn(v => v);

      await uidService.generateUIDField({
        contentTypeUID: 'my-model',
        field: 'slug',
        data: {
          title: 'Test title',
        },
      });

      await uidService.generateUIDField({
        contentTypeUID: 'my-model',
        field: 'slug',
        data: {},
      });

      expect(uidService.findUniqueUID).toHaveBeenCalledTimes(2);
    });

    test('Uses targetField value for generation', async () => {
      const findMany = jest.fn(async () => {
        return [{ slug: 'test-title' }];
      });

      const strapi = {
        contentTypes: {
          'my-model': {
            modelName: 'myTestModel',
            attributes: {
              title: {
                type: 'string',
              },
              slug: {
                type: 'uid',
                targetField: 'title',
              },
            },
          },
        },
        db: {
          query() {
            return {
              findMany,
            };
          },
        },
      };
      const uidService = uidServiceLoader({ strapi });

      const uid = await uidService.generateUIDField({
        contentTypeUID: 'my-model',
        field: 'slug',
        data: {
          title: 'Test title',
        },
      });

      expect(uid).toBe('test-title-1');

      // change find response
      strapi.db.query = () => ({ findMany: jest.fn(async () => []) });

      const uidWithEmptyTarget = await uidService.generateUIDField({
        contentTypeUID: 'my-model',
        field: 'slug',
        data: {
          title: '',
        },
      });

      expect(uidWithEmptyTarget).toBe('my-test-model');
    });

    test('Uses options for generation', async () => {
      const strapi = {
        contentTypes: {
          'my-model': {
            modelName: 'myTestModel',
            attributes: {
              title: {
                type: 'string',
              },
              slug: {
                type: 'uid',
                targetField: 'title',
                options: { lowercase: false },
              },
            },
          },
        },
        db: {
          query() {
            return {
              findMany: async () => [],
            };
          },
        },
      };
      const uidService = uidServiceLoader({ strapi });

      const uid = await uidService.generateUIDField({
        contentTypeUID: 'my-model',
        field: 'slug',
        data: {
          title: 'Test title',
        },
      });

      expect(uid).toBe('Test-title');
    });

    test('Ignores minLength attribute (should be handle by the user)', async () => {
      const strapi = {
        contentTypes: {
          'my-model': {
            modelName: 'myTestModel',
            attributes: {
              title: {
                type: 'string',
              },
              slug: {
                type: 'uid',
                targetField: 'title',
                minLength: 100,
              },
            },
          },
        },
        db: {
          query() {
            return {
              findMany: async () => [],
            };
          },
        },
      };
      const uidService = uidServiceLoader({ strapi });

      const uid = await uidService.generateUIDField({
        contentTypeUID: 'my-model',
        field: 'slug',
        data: {
          title: 'Test UID',
        },
      });

      expect(uid).toBe('test-uid');
    });

    test('Ignores maxLength attribute (should be handled user side)', async () => {
      const strapi = {
        contentTypes: {
          'my-model': {
            modelName: 'myTestModel',
            attributes: {
              title: {
                type: 'string',
              },
              slug: {
                type: 'uid',
                targetField: 'title',
                maxLength: 10,
              },
            },
          },
        },
        db: {
          query() {
            return {
              findMany: async () => [],
            };
          },
        },
      };
      const uidService = uidServiceLoader({ strapi });

      const uid = await uidService.generateUIDField({
        contentTypeUID: 'my-model',
        field: 'slug',
        data: {
          title: 'Test with a 999 very long title',
        },
      });

      expect(uid).toBe('test-with-a-999-very-long-title');
    });

    test('Generates a UID using the default value if necessary', async () => {
      const strapi = {
        contentTypes: {
          'my-model': {
            modelName: 'myTestModel',
            attributes: {
              slug: {
                type: 'uid',
                default: 'slug-default',
              },
            },
          },
        },
        db: {
          query() {
            return {
              findMany: async () => [],
            };
          },
        },
      };
      const uidService = uidServiceLoader({ strapi });

      const uid = await uidService.generateUIDField({
        contentTypeUID: 'my-model',
        field: 'slug',
        data: {},
      });

      expect(uid).toBe('slug-default');
    });
  });

  describe('findUniqueUID', () => {
    test('Finds closest match', async () => {
      const findMany = jest.fn(async () => {
        return [
          { slug: 'my-test-model' },
          { slug: 'my-test-model-1' },
          // it finds the quickest match possible
          { slug: 'my-test-model-4' },
        ];
      });

      const strapi = {
        contentTypes: {
          'my-model': {
            modelName: 'myTestModel',
            attributes: {
              slug: {
                type: 'uid',
              },
            },
          },
        },
        db: {
          query() {
            return {
              findMany,
            };
          },
        },
      };
      const uidService = uidServiceLoader({ strapi });

      const uid = await uidService.findUniqueUID({
        contentTypeUID: 'my-model',
        field: 'slug',
        value: 'my-test-model',
      });

      expect(uid).toBe('my-test-model-2');
    });

    test('Calls db find', async () => {
      const findMany = jest.fn(async () => {
        return [];
      });

      const strapi = {
        contentTypes: {
          'my-model': {
            modelName: 'myTestModel',
            attributes: {
              slug: {
                type: 'uid',
              },
            },
          },
        },
        db: {
          query() {
            return {
              findMany,
            };
          },
        },
      };
      const uidService = uidServiceLoader({ strapi });

      await uidService.findUniqueUID({
        contentTypeUID: 'my-model',
        field: 'slug',
        value: 'my-test-model',
      });

      expect(findMany).toHaveBeenCalledWith({
        where: { slug: { $eqi: 'my-test-model' } },
      });
    });
  });

  describe('CheckUIDAvailability', () => {
    test('Counts the data in db', async () => {
      const count = jest.fn(async () => 0);

      const strapi = {
        db: {
          query() {
            return {
              count,
            };
          },
        },
      };
      const uidService = uidServiceLoader({ strapi });

      const isAvailable = await uidService.checkUIDAvailability({
        contentTypeUID: 'my-model',
        field: 'slug',
        value: 'my-test-model',
      });

      expect(count).toHaveBeenCalledWith({ where: { slug: 'my-test-model' } });
      expect(isAvailable).toBe(true);
    });
  });
});
