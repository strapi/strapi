'use strict';

const { EventEmitter } = require('events');
const createEntityService = require('../entity-service');
const entityValidator = require('../entity-validator');

describe('Entity service', () => {
  global.strapi = {
    getModel: jest.fn(() => ({})),
    config: {
      get() {
        return [];
      },
    },
  };

  describe('Find', () => {
    test('Returns first element for single types', async () => {
      const data = {
        id: 1,
        title: 'Test',
      };

      const fakeQuery = {
        find: jest.fn(() => Promise.resolve([data])),
      };

      const fakeDB = {
        getModel: jest.fn(() => {
          return { kind: 'singleType', privateAttributes: [] };
        }),
        query: jest.fn(() => fakeQuery),
      };

      const instance = createEntityService({
        db: fakeDB,
        eventHub: new EventEmitter(),
      });

      const result = await instance.find({}, { model: 'test-model' });

      expect(fakeDB.getModel).toHaveBeenCalledTimes(1);
      expect(fakeDB.getModel).toHaveBeenCalledWith('test-model');

      expect(fakeDB.query).toHaveBeenCalledWith('test-model');
      expect(fakeQuery.find).toHaveBeenCalledWith({ _limit: 1 }, undefined);
      expect(result).toEqual(data);
    });
  });

  describe('Create', () => {
    test('Throws when trying to create a new single type entry if there is already one', async () => {
      const fakeQuery = {
        count: jest.fn(() => Promise.resolve(1)),
      };

      const fakeDB = {
        getModel: jest.fn(() => {
          return { kind: 'singleType', privateAttributes: [] };
        }),
        query: jest.fn(() => fakeQuery),
      };

      const instance = createEntityService({
        db: fakeDB,
        eventHub: new EventEmitter(),
      });

      await expect(instance.create({ data: {} }, { model: 'test-model' })).rejects.toThrow(
        'Single type entry can only be created once'
      );

      expect(fakeDB.getModel).toHaveBeenCalledTimes(1);
      expect(fakeDB.getModel).toHaveBeenCalledWith('test-model');

      expect(fakeDB.query).toHaveBeenCalledWith('test-model');
      expect(fakeQuery.count).toHaveBeenCalled();
    });

    describe('assign default values', () => {
      let instance;

      beforeAll(() => {
        const fakeQuery = {
          count: jest.fn(() => 0),
          create: jest.fn(data => data),
        };

        const fakeModel = {
          kind: 'contentType',
          modelName: 'test-model',
          privateAttributes: [],
          options: {},
          attributes: {
            attrStringDefaultRequired: { type: 'string', default: 'default value', required: true },
            attrStringDefault: { type: 'string', default: 'default value' },
            attrBoolDefaultRequired: { type: 'boolean', default: true, required: true },
            attrBoolDefault: { type: 'boolean', default: true },
            attrIntDefaultRequired: { type: 'integer', default: 1, required: true },
            attrIntDefault: { type: 'integer', default: 1 },
            attrEnumDefaultRequired: {
              type: 'enumeration',
              enum: ['a', 'b', 'c'],
              default: 'a',
              required: true,
            },
            attrEnumDefault: {
              type: 'enumeration',
              enum: ['a', 'b', 'c'],
              default: 'b',
            },
          },
        };

        const fakeDB = {
          getModel: jest.fn(() => fakeModel),
          query: jest.fn(() => fakeQuery),
        };

        instance = createEntityService({
          db: fakeDB,
          eventHub: new EventEmitter(),
          entityValidator,
        });
      });

      test('should create record with all default attributes', async () => {
        const data = {};

        await expect(instance.create({ data }, { model: 'test-model' })).resolves.toMatchObject({
          attrStringDefaultRequired: 'default value',
          attrStringDefault: 'default value',
          attrBoolDefaultRequired: true,
          attrBoolDefault: true,
          attrIntDefaultRequired: 1,
          attrIntDefault: 1,
          attrEnumDefaultRequired: 'a',
          attrEnumDefault: 'b',
        });
      });

      test('should create record with default and required attributes', async () => {
        const data = {
          attrStringDefault: 'my value',
          attrBoolDefault: false,
          attrIntDefault: 2,
          attrEnumDefault: 'c',
        };

        await expect(instance.create({ data }, { model: 'test-model' })).resolves.toMatchObject({
          attrStringDefault: 'my value',
          attrBoolDefault: false,
          attrIntDefault: 2,
          attrEnumDefault: 'c',
          attrStringDefaultRequired: 'default value',
          attrBoolDefaultRequired: true,
          attrIntDefaultRequired: 1,
          attrEnumDefaultRequired: 'a',
        });
      });

      test('should create record with provided data', async () => {
        const data = {
          attrStringDefaultRequired: 'my value',
          attrStringDefault: 'my value',
          attrBoolDefaultRequired: true,
          attrBoolDefault: true,
          attrIntDefaultRequired: 10,
          attrIntDefault: 10,
          attrEnumDefaultRequired: 'c',
          attrEnumDefault: 'a',
        };

        await expect(instance.create({ data }, { model: 'test-model' })).resolves.toMatchObject(
          data
        );
      });
    });
  });
});
