'use strict';

jest.mock('bcryptjs', () => ({ hashSync: () => 'secret-password' }));

const { EventEmitter } = require('events');
const createEntityService = require('..');
const entityValidator = require('../../entity-validator');

describe('Entity service', () => {
  global.strapi = {
    getModel: jest.fn(() => ({})),
    config: {
      get() {
        return [];
      },
    },
  };

  describe('Decorator', () => {
    test.each(['create', 'update', 'findMany', 'findOne', 'delete', 'count', 'findPage'])(
      'Can decorate',
      async (method) => {
        const instance = createEntityService({
          strapi: {},
          db: {},
          eventHub: new EventEmitter(),
        });

        const methodFn = jest.fn();
        const decorator = () => ({
          [method]: methodFn,
        });

        instance.decorate(decorator);

        const args = [{}, {}];
        await instance[method](...args);
        expect(methodFn).toHaveBeenCalled();
      }
    );
  });

  describe('Find', () => {
    test('Returns first element for single types', async () => {
      const data = {
        id: 1,
        title: 'Test',
      };

      const fakeQuery = {
        findOne: jest.fn(() => Promise.resolve(data)),
      };

      const fakeDB = {
        query: jest.fn(() => fakeQuery),
      };

      const fakeStrapi = {
        getModel: jest.fn(() => {
          return { kind: 'singleType', privateAttributes: [] };
        }),
      };

      const instance = createEntityService({
        strapi: fakeStrapi,
        db: fakeDB,
        eventHub: new EventEmitter(),
      });

      const result = await instance.findMany('test-model');

      expect(fakeStrapi.getModel).toHaveBeenCalledTimes(1);
      expect(fakeStrapi.getModel).toHaveBeenCalledWith('test-model');

      expect(fakeDB.query).toHaveBeenCalledWith('test-model');
      expect(fakeQuery.findOne).toHaveBeenCalledWith({});
      expect(result).toEqual(data);
    });
  });

  describe('Create', () => {
    describe('assign default values', () => {
      let instance;

      beforeAll(() => {
        const fakeQuery = {
          count: jest.fn(() => 0),
          create: jest.fn(({ data }) => data),
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
            attrPassword: { type: 'password' },
          },
        };

        const fakeDB = {
          query: jest.fn(() => fakeQuery),
        };

        const fakeStrapi = {
          getModel: jest.fn(() => fakeModel),
        };

        instance = createEntityService({
          strapi: fakeStrapi,
          db: fakeDB,
          eventHub: new EventEmitter(),
          entityValidator,
        });
      });

      test('should create record with all default attributes', async () => {
        const data = {};

        await expect(instance.create('test-model', { data })).resolves.toMatchObject({
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

        await expect(instance.create('test-model', { data })).resolves.toMatchObject({
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
          attrPassword: 'fooBar',
        };

        await expect(instance.create('test-model', { data })).resolves.toMatchObject({
          ...data,
          attrPassword: 'secret-password',
        });
      });
    });
  });

  describe('Update', () => {
    describe('assign default values', () => {
      let instance;

      const entityUID = 'api::entity.entity';
      const relationUID = 'api::relation.relation';
      const fakeEntities = {
        0: {
          id: 0,
          Name: 'TestEntity',
          createdAt: '2022-09-28T15:11:22.995Z',
          updatedAt: '2022-09-29T09:01:02.949Z',
          publishedAt: null,
        },
        1: {
          id: 1,
          Name: 'TestRelation',
          createdAt: '2022-09-28T15:11:22.995Z',
          updatedAt: '2022-09-29T09:01:02.949Z',
          publishedAt: null,
        },
        2: null,
      };
      beforeAll(() => {
        const fakeModel = {
          kind: 'collectionType',
          modelName: 'entity',
          collectionName: 'entity',
          uid: entityUID,
          privateAttributes: [],
          options: {},
          info: {
            singularName: 'entity',
            pluralName: 'entities',
            displayName: 'ENTITY',
          },
          attributes: {
            Name: {
              type: 'string',
            },
            addresses: {
              type: 'relation',
              relation: 'oneToMany',
              target: relationUID,
              mappedBy: 'entity',
            },
            updatedBy: {
              type: 'relation',
              relation: 'oneToOne',
              target: 'admin::user',
              configurable: false,
              writable: false,
              visible: false,
              useJoinTable: false,
              private: true,
            },
          },
        };

        const fakeQuery = {
          findOne: jest.fn(({ where }) => fakeEntities[where.id]),
          update: jest.fn(({ where }) => ({
            ...fakeEntities[where.id],
            addresses: {
              count: 1,
            },
          })),
        };

        const fakeDB = {
          query: jest.fn(() => fakeQuery),
        };

        const fakeStrapi = {
          getModel: jest.fn(() => fakeModel),
        };

        instance = createEntityService({
          strapi: fakeStrapi,
          db: fakeDB,
          eventHub: null, // bypass event emission for update tests
          entityValidator,
        });
      });

      test(`should fail if the entity doesn't exist`, async () => {
        expect(
          await instance.update(entityUID, Math.random() * (10000 - 100) + 100, {})
        ).toBeNull();
      });

      test('should successfully update with an existing relation', async () => {
        const data = {
          Name: 'TestEntry',
          addresses: {
            connect: [
              {
                id: 1,
              },
            ],
          },
          updatedBy: 1,
        };
        expect(await instance.update(entityUID, 0, { data })).toMatchObject({
          ...fakeEntities[0],
          addresses: {
            count: 1,
          },
        });
      });

      test('should throw an error when trying to associate a relation that does not exist', async () => {
        const data = {
          Name: 'TestEntry',
          addresses: {
            connect: [
              {
                id: 2,
              },
            ],
          },
          updatedBy: 1,
        };

        await expect(instance.update(entityUID, 0, { data })).rejects.toThrow();
      });
    });
  });
});
