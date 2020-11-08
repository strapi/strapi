'use strict';
const { createCoreApi } = require('../index');

describe('Core Api', () => {
  describe('Default behavior', () => {
    test('Returns a service and a controller', () => {
      const result = createCoreApi({
        api: {},
        model: {
          modelName: 'testModel',
          kind: 'collectionType',
        },
        strapi: {},
      });

      expect(result).toMatchObject({
        service: {},
        controller: {},
      });
    });
  });

  describe('Overwrites controller', () => {
    test('Adds new actions', () => {
      const testAction = jest.fn();

      const result = createCoreApi({
        api: {
          controllers: {
            testModel: {
              testAction,
            },
          },
        },
        model: {
          modelName: 'testModel',
          kind: 'collectionType',
        },
        strapi: {},
      });

      expect(result.controller.testAction).toBe(testAction);
    });

    test('Overrides existing actions', () => {
      const defaultApi = createCoreApi({
        api: {},
        model: {
          modelName: 'testModel',
          kind: 'collectionType',
        },
        strapi: {},
      });

      expect(defaultApi.controller.find).toBeDefined();
      expect(typeof defaultApi.controller.find).toBe('function');

      const overWriteFind = jest.fn();

      const result = createCoreApi({
        api: {
          controllers: {
            testModel: {
              find: overWriteFind,
            },
          },
        },
        model: {
          modelName: 'testModel',
          kind: 'collectionType',
        },
        strapi: {},
      });

      expect(result.controller.find).toBeDefined();
      expect(typeof result.controller.find).toBe('function');
      expect(result.controller.find).toBe(overWriteFind);
    });
  });

  describe('Overwrites service', () => {
    test('Adds new actions', () => {
      const testAction = jest.fn();

      const result = createCoreApi({
        api: {
          services: {
            testModel: {
              testAction,
            },
          },
        },
        model: {
          modelName: 'testModel',
          kind: 'collectionType',
        },
        strapi: {},
      });

      expect(result.service.testAction).toBe(testAction);
    });

    test('Overrides existing actions', () => {
      const defaultApi = createCoreApi({
        api: {},
        model: {
          modelName: 'testModel',
          kind: 'collectionType',
        },
        strapi: {},
      });

      expect(defaultApi.service.find).toBeDefined();
      expect(typeof defaultApi.service.find).toBe('function');

      const overWriteFind = jest.fn();

      const result = createCoreApi({
        api: {
          services: {
            testModel: {
              find: overWriteFind,
            },
          },
        },
        model: {
          modelName: 'testModel',
          kind: 'collectionType',
        },
        strapi: {},
      });

      expect(result.service.find).toBeDefined();
      expect(typeof result.service.find).toBe('function');
      expect(result.service.find).toBe(overWriteFind);
    });
  });
});
