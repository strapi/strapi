'use strict';

jest.mock('bcryptjs', () => ({ hashSync: () => 'secret-password' }));

const { EventEmitter } = require('events');
const { ValidationError } = require('@strapi/utils').errors;
const createEntityService = require('..');
const entityValidator = require('../../entity-validator');

jest.mock('../../utils/upload-files', () => jest.fn(() => Promise.resolve()));

describe('Entity service', () => {
  global.strapi = {
    getModel: jest.fn(() => ({})),
    config: {
      get() {
        return [];
      },
    },
    query: jest.fn(() => ({})),
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
    const fakeQuery = {
      count: jest.fn(() => 0),
      create: jest.fn(({ data }) => ({
        id: 1,
        ...data,
      })),
      findOne: jest.fn(),
    };
    const fakeModels = {};

    beforeAll(() => {
      global.strapi.getModel.mockImplementation((modelName) => fakeModels[modelName]);
      global.strapi.query.mockImplementation(() => fakeQuery);
    });
    beforeEach(() => {
      jest.clearAllMocks();
    });
    afterAll(() => {
      global.strapi.getModel.mockImplementation(() => ({}));
    });
    describe('assign default values', () => {
      let instance;
      const entityUID = 'api::entity.entity';
      const relationUID = 'api::relation.relation';

      beforeAll(() => {
        const fakeEntities = {
          [relationUID]: {
            1: {
              id: 1,
              Name: 'TestRelation',
              createdAt: '2022-09-28T15:11:22.995Z',
              updatedAt: '2022-09-29T09:01:02.949Z',
              publishedAt: null,
            },
            2: {
              id: 2,
              Name: 'TestRelation2',
              createdAt: '2022-09-28T15:11:22.995Z',
              updatedAt: '2022-09-29T09:01:02.949Z',
              publishedAt: null,
            },
          },
        };

        fakeModels[entityUID] = {
          uid: entityUID,
          kind: 'contentType',
          modelName: 'test-model',
          privateAttributes: [],
          options: {},
          attributes: {
            attrStringDefaultRequired: {
              type: 'string',
              default: 'default value',
              required: true,
            },
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
          },
          [relationUID]: {
            uid: relationUID,
            kind: 'contentType',
            modelName: 'relation',
            attributes: {
              Name: {
                type: 'string',
                default: 'default value',
                required: true,
              },
            },
            attrPassword: { type: 'password' },
            attrRelation: {
              type: 'relation',
              relation: 'oneToMany',
              target: relationUID,
              mappedBy: 'entity',
            },
          },
        };
        fakeModels[relationUID] = {
          uid: relationUID,
          kind: 'contentType',
          modelName: 'relation',
          attributes: {
            Name: {
              type: 'string',
              default: 'default value',
              required: true,
            },
          },
        };
        const fakeQuery = (uid) => ({
          create: jest.fn(({ data }) => data),
          count: jest.fn(({ where }) => {
            return where.id.$in.filter((id) => Boolean(fakeEntities[uid][id])).length;
          }),
        });

        const fakeDB = {
          query: jest.fn((uid) => fakeQuery(uid)),
        };

        global.strapi.db = fakeDB;

        instance = createEntityService({
          strapi: global.strapi,
          db: fakeDB,
          eventHub: new EventEmitter(),
          entityValidator,
        });
      });
      afterAll(() => {
        global.strapi.db = {
          query: jest.fn(() => fakeQuery),
        };
      });
      test('should create record with all default attributes', async () => {
        const data = {};

        await expect(instance.create(entityUID, { data })).resolves.toMatchObject({
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

        await expect(instance.create(entityUID, { data })).resolves.toMatchObject({
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

        await expect(instance.create(entityUID, { data })).resolves.toMatchObject({
          ...data,
          attrPassword: 'secret-password',
        });
      });

      test('should create record with valid relation', async () => {
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
          attrRelation: {
            connect: [
              {
                id: 1,
              },
            ],
          },
        };

        const res = instance.create(entityUID, { data });

        await expect(res).resolves.toMatchObject({
          ...data,
          attrPassword: 'secret-password',
        });
      });

      test('should fail to create a record with an invalid relation', async () => {
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
          attrRelation: {
            connect: [
              {
                id: 3,
              },
            ],
          },
        };

        const res = instance.create(entityUID, { data });
        await expect(res).rejects.toThrowError(
          new ValidationError(
            `1 relation(s) of type api::relation.relation associated with this entity do not exist`
          )
        );
      });
    });

    describe('with files', () => {
      let instance;
      beforeAll(() => {
        fakeModels['test-model'] = {
          uid: 'test-model',
          kind: 'collectionType',
          collectionName: 'test-model',
          options: {},
          attributes: {
            name: {
              type: 'string',
            },
            activity: {
              displayName: 'activity',
              type: 'component',
              repeatable: true,
              component: 'basic.activity',
            },
          },
          modelType: 'contentType',
          modelName: 'test-model',
        };
        fakeModels['basic.activity'] = {
          collectionName: 'components_basic_activities',
          info: {
            displayName: 'activity',
          },
          options: {},
          attributes: {
            docs: {
              allowedTypes: ['images', 'files', 'videos', 'audios'],
              type: 'media',
              multiple: true,
            },
            name: {
              type: 'string',
            },
          },
          uid: 'basic.activity',
          category: 'basic',
          modelType: 'component',
          modelName: 'activity',
          globalId: 'ComponentBasicActivity',
        };

        const fakeDB = {
          query: jest.fn(() => fakeQuery),
        };

        const fakeStrapi = {
          getModel: jest.fn((modelName) => fakeModels[modelName]),
        };
        instance = createEntityService({
          strapi: fakeStrapi,
          db: fakeDB,
          eventHub: new EventEmitter(),
          entityValidator,
        });
      });
      test('should create record with attached files', async () => {
        const uploadFiles = require('../../utils/upload-files');
        const data = {
          name: 'demoEvent',
          activity: [{ name: 'Powering the Aviation of the Future' }],
        };
        const files = {
          'activity.0.docs': {
            size: 381924,
            path: '/tmp/upload_4cab76a3a443b584a1fd3aa52e045130',
            name: 'thisisajpeg.jpeg',
            type: 'image/jpeg',
            mtime: '2022-11-03T13:36:51.764Z',
          },
        };

        fakeQuery.findOne.mockResolvedValue({ id: 1, ...data });

        await instance.create('test-model', { data, files });

        expect(global.strapi.getModel).toBeCalled();
        expect(uploadFiles).toBeCalled();
        expect(uploadFiles).toBeCalledTimes(1);
        expect(uploadFiles).toBeCalledWith(
          'test-model',
          {
            id: 1,
            name: 'demoEvent',
            activity: [
              {
                id: 1,
                __pivot: {
                  field: 'activity',
                  component_type: 'basic.activity',
                },
              },
            ],
          },
          files
        );
      });
    });
  });

  describe('Update', () => {
    describe('assign default values', () => {
      let instance;

      const entityUID = 'api::entity.entity';
      const relationUID = 'api::relation.relation';

      const fakeEntities = {
        [entityUID]: {
          0: {
            id: 0,
            Name: 'TestEntity',
            createdAt: '2022-09-28T15:11:22.995Z',
            updatedAt: '2022-09-29T09:01:02.949Z',
            publishedAt: null,
          },
        },
        [relationUID]: {
          1: {
            id: 1,
            Name: 'TestRelation',
            createdAt: '2022-09-28T15:11:22.995Z',
            updatedAt: '2022-09-29T09:01:02.949Z',
            publishedAt: null,
          },
          2: {
            id: 2,
            Name: 'TestRelation2',
            createdAt: '2022-09-28T15:11:22.995Z',
            updatedAt: '2022-09-29T09:01:02.949Z',
            publishedAt: null,
          },
        },
      };
      const fakeModels = {
        [entityUID]: {
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
          },
        },
        [relationUID]: {
          kind: 'contentType',
          modelName: 'relation',
          attributes: {
            Name: {
              type: 'string',
              default: 'default value',
              required: true,
            },
          },
        },
      };

      beforeAll(() => {
        const fakeQuery = (key) => ({
          findOne: jest.fn(({ where }) => fakeEntities[key][where.id]),
          count: jest.fn(({ where }) => {
            let ret = 0;
            where.id.$in.forEach((id) => {
              const entity = fakeEntities[key][id];
              if (!entity) return;
              ret += 1;
            });
            return ret;
          }),
          update: jest.fn(({ where }) => ({
            ...fakeEntities[key][where.id],
            addresses: {
              count: 1,
            },
          })),
        });

        const fakeDB = {
          query: jest.fn((key) => fakeQuery(key)),
        };

        global.strapi = {
          getModel: jest.fn((uid) => {
            return fakeModels[uid];
          }),
          db: fakeDB,
        };

        instance = createEntityService({
          strapi: global.strapi,
          db: fakeDB,
          eventHub: new EventEmitter(),
          entityValidator,
        });
      });

      test(`should fail if the entity doesn't exist`, async () => {
        expect(
          await instance.update(entityUID, Math.random() * (10000 - 100) + 100, {})
        ).toBeNull();
      });

      test('should successfully update an existing relation', async () => {
        const data = {
          Name: 'TestEntry',
          addresses: {
            connect: [
              {
                id: 1,
              },
            ],
          },
        };
        expect(await instance.update(entityUID, 0, { data })).toMatchObject({
          ...fakeEntities[entityUID][0],
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
                id: 3,
              },
            ],
          },
        };

        const res = instance.update(entityUID, 0, { data });
        await expect(res).rejects.toThrowError(
          new ValidationError(
            `1 relation(s) of type api::relation.relation associated with this entity do not exist`
          )
        );
      });
    });
  });
});
