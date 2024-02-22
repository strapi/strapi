import uidServiceLoader from '../uid';

describe('Test uid service', () => {
  describe('generateUIDField', () => {
    const baseStrapi = {
      getModel() {
        return this.contentTypes['my-model'];
      },
      documents() {
        return {
          find: async () => [],
          findMany: async () => [],
        };
      },
    } as any;

    test('Uses modelName if no targetField specified or set', async () => {
      const strapi = {
        ...baseStrapi,
        contentTypes: {
          'my-model': {
            modelName: 'myTestModel',
            kind: 'collectionType',
            attributes: {
              slug: {
                type: 'uid',
              },
            },
          },
        },
      } as any;
      const uidService = uidServiceLoader({ strapi });

      const uid = await uidService.generateUIDField({
        contentTypeUID: 'my-model',
        field: 'slug',
        data: {},
      } as any);

      expect(uid).toBe('my-test-model');
    });

    test('Calls findUniqueUID', async () => {
      const strapi = {
        ...baseStrapi,
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
      } as any;
      const uidService = uidServiceLoader({ strapi });
      uidService.findUniqueUID = jest.fn(
        (v) =>
          new Promise((resolve) => {
            resolve(v as any);
          })
      );

      await uidService.generateUIDField({
        contentTypeUID: 'my-model',
        field: 'slug',
        data: {
          title: 'Test title',
        },
      } as any);

      await uidService.generateUIDField({
        contentTypeUID: 'my-model',
        field: 'slug',
        data: {},
      } as any);

      expect(uidService.findUniqueUID).toHaveBeenCalledTimes(2);
    });

    test('Uses targetField value for generation', async () => {
      const findMany = jest.fn(async () => {
        return [{ slug: 'test-title' }];
      });

      let strapi = {
        ...baseStrapi,
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
        documents() {
          return {
            findMany,
          };
        },
      } as any;

      const uidService = uidServiceLoader({ strapi });

      const uid = await uidService.generateUIDField({
        contentTypeUID: 'my-model',
        field: 'slug',
        data: {
          title: 'Test title',
        },
      } as any);

      expect(uid).toBe('test-title-1');

      strapi = {
        ...strapi,
        documents: baseStrapi.documents,
      };

      const uidWithEmptyTarget = await uidService.generateUIDField({
        contentTypeUID: 'my-model',
        field: 'slug',
        data: {
          title: '',
        },
      } as any);

      expect(uidWithEmptyTarget).toBe('my-test-model');
    });

    test('Uses options for generation', async () => {
      const strapi = {
        ...baseStrapi,
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
      } as any;
      const uidService = uidServiceLoader({ strapi });

      const uid = await uidService.generateUIDField({
        contentTypeUID: 'my-model',
        field: 'slug',
        data: {
          title: 'Test title',
        },
      } as any);

      expect(uid).toBe('Test-title');
    });

    test('Ignores minLength attribute (should be handle by the user)', async () => {
      const strapi = {
        ...baseStrapi,
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
      } as any;

      const uidService = uidServiceLoader({ strapi });

      const uid = await uidService.generateUIDField({
        contentTypeUID: 'my-model',
        field: 'slug',
        data: {
          title: 'Test UID',
        },
      } as any);

      expect(uid).toBe('test-uid');
    });

    test('Ignores maxLength attribute (should be handled user side)', async () => {
      const strapi = {
        ...baseStrapi,
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
      } as any;

      const uidService = uidServiceLoader({ strapi });

      const uid = await uidService.generateUIDField({
        contentTypeUID: 'my-model',
        field: 'slug',
        data: {
          title: 'Test with a 999 very long title',
        },
      } as any);

      expect(uid).toBe('test-with-a-999-very-long-title');
    });

    test('Generates a UID using the default value if necessary', async () => {
      const strapi = {
        ...baseStrapi,
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
      } as any;
      const uidService = uidServiceLoader({ strapi });

      const uid = await uidService.generateUIDField({
        contentTypeUID: 'my-model',
        field: 'slug',
        data: {},
      } as any);

      expect(uid).toBe('slug-default');
    });
  });

  describe('findUniqueUID', () => {
    const baseStrapi = {
      getModel() {
        return this.contentTypes['my-model'];
      },
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
    } as any;

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
        ...baseStrapi,
        documents() {
          return {
            findMany,
          };
        },
      } as any;

      const uidService = uidServiceLoader({ strapi });

      const uid = await uidService.findUniqueUID({
        contentTypeUID: 'my-model',
        field: 'slug',
        value: 'my-test-model',
      } as any);

      expect(uid).toBe('my-test-model-2');
    });

    test('Calls db find', async () => {
      const findMany = jest.fn(async () => {
        return [];
      });

      const strapi = {
        ...baseStrapi,
        documents() {
          return {
            findMany,
          };
        },
      } as any;

      const uidService = uidServiceLoader({ strapi });

      await uidService.findUniqueUID({
        contentTypeUID: 'my-model',
        field: 'slug',
        value: 'my-test-model',
        locale: 'en',
      } as any);

      expect(findMany).toHaveBeenCalledWith({
        filters: {
          slug: { $startsWith: 'my-test-model' },
        },
        locale: 'en',
        status: 'draft',
      });
    });
  });

  describe('CheckUIDAvailability', () => {
    test('Counts the data in db', async () => {
      const count = jest.fn(async () => 0);

      const strapi = {
        getModel() {
          return {
            modelName: 'myTestModel',
            kind: 'collectionType',
            attributes: {
              slug: {
                type: 'uid',
              },
            },
          };
        },
        documents() {
          return {
            count,
          };
        },
      } as any;

      const uidService = uidServiceLoader({ strapi });

      const isAvailable = await uidService.checkUIDAvailability({
        contentTypeUID: 'my-model',
        field: 'slug',
        value: 'my-test-model',
        locale: 'en',
      } as any);

      expect(count).toHaveBeenCalledWith({
        filters: {
          slug: 'my-test-model',
        },
        locale: 'en',
        status: 'draft',
      });
      expect(isAvailable).toBe(true);
    });
  });
});
