import { EventEmitter } from 'events';
import { errors } from '@strapi/utils';
import type { Schema, Utils } from '@strapi/types';
import createEntityService from '..';
import entityValidator from '../../entity-validator';
import createEventHub from '../../event-hub';
import uploadFiles from '../../utils/upload-files';

jest.mock('bcryptjs', () => ({ hashSync: () => 'secret-password' }));

jest.mock('../../utils/upload-files', () => jest.fn(() => Promise.resolve()));

describe('Entity service', () => {
  const eventHub = createEventHub();

  global.strapi = {
    getModel: jest.fn(() => ({})),
    config: {
      get() {
        return [];
      },
    },
    query: jest.fn(() => ({})),
    webhookStore: {
      allowedEvents: new Map([['ENTRY_CREATE', 'entry.create']]),
      addAllowedEvent: jest.fn(),
    },
  } as any;

  describe('Decorator', () => {
    test.each(['create', 'update', 'findMany', 'findOne', 'delete', 'count', 'findPage'] as const)(
      'Can decorate',
      async (method) => {
        const instance = createEntityService({
          strapi: global.strapi,
          db: {} as any,
          eventHub,
          entityValidator,
        });

        const methodFn = jest.fn();

        instance.decorate((old) => ({
          ...old,
          [method]: methodFn,
        }));

        const args = [{}, {}];
        await (instance[method] as Utils.Function.Any)(...args);
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
        transaction: (cb: Utils.Function.Any) => cb(),
      };

      const fakeStrapi = {
        ...global.strapi,
        query: fakeQuery,
        getModel: jest.fn(() => {
          return { kind: 'singleType' };
        }),
      };

      const instance = createEntityService({
        strapi: fakeStrapi as any,
        db: fakeDB as any,
        eventHub,
        entityValidator,
      });

      const result = await instance.findMany('api::test.test-model');

      expect(fakeStrapi.getModel).toHaveBeenCalledTimes(1);
      expect(fakeStrapi.getModel).toHaveBeenCalledWith('api::test.test-model');

      expect(fakeDB.query).toHaveBeenCalledWith('api::test.test-model');
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
    const fakeModels: Record<string, Schema.ContentType | Schema.Component> = {};

    beforeAll(() => {
      jest
        .mocked(global.strapi.getModel)
        .mockImplementation((modelName: string) => fakeModels[modelName] as any);

      jest.mocked(global.strapi.query).mockImplementation(() => fakeQuery as any);
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterAll(() => {
      jest.mocked(global.strapi.getModel).mockImplementation(() => ({} as any));
    });

    describe('assign default values', () => {
      let instance: any;
      const entityUID = 'api::entity.entity';
      const relationUID = 'api::relation.relation';

      beforeAll(() => {
        const fakeEntities: Record<string, Record<string, unknown>> = {
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
          modelType: 'contentType',
          uid: entityUID,
          kind: 'collectionType',
          modelName: 'test-model',
          globalId: 'test-model',
          info: {
            singularName: 'entity',
            pluralName: 'entities',
            displayName: 'ENTITY',
          },
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
            attrEnumDefault: {
              type: 'enumeration',
              enum: ['a', 'b', 'c'],
              default: 'b',
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
          modelType: 'contentType',
          globalId: 'relation',
          info: {
            displayName: 'RELATION',
            singularName: 'relation',
            pluralName: 'relations',
          },
          kind: 'collectionType',
          modelName: 'relation',
          attributes: {
            Name: {
              type: 'string',
              default: 'default value',
              required: true,
            },
          },
        };
        const fakeQuery = (uid: string) =>
          ({
            create: jest.fn(({ data }) => data),
            count: jest.fn(({ where }) => {
              return where.id.$in.filter((id: string) => Boolean(fakeEntities[uid][id])).length;
            }),
          } as any);

        const fakeDB = {
          transaction: (cb: Utils.Function.Any) => cb(),
          query: jest.fn((uid) => fakeQuery(uid)),
        } as any;

        global.strapi = {
          ...global.strapi,
          db: fakeDB,
          query: jest.fn((uid) => fakeQuery(uid)),
        } as any;

        instance = createEntityService({
          strapi: global.strapi,
          db: fakeDB,
          eventHub,
          entityValidator,
        });
      });

      afterAll(() => {
        global.strapi = {
          ...global.strapi,
          db: {
            query: jest.fn(() => fakeQuery),
          },
          query: jest.fn(() => fakeQuery),
        } as any;
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
          new errors.ValidationError(
            `1 relation(s) of type api::relation.relation associated with this entity do not exist`
          )
        );
      });
    });

    describe('with files', () => {
      let instance: any;

      beforeAll(() => {
        fakeModels['api::test.test-model'] = {
          uid: 'api::test.test-model',
          kind: 'collectionType',
          collectionName: 'test-model',
          info: {
            displayName: 'test-model',
            singularName: 'test-model',
            pluralName: 'test-models',
          },
          options: {},
          attributes: {
            name: {
              type: 'string',
            },
            activity: {
              type: 'component',
              repeatable: true,
              component: 'basic.activity',
            },
          },
          modelType: 'contentType',
          modelName: 'test-model',
          globalId: 'test-model',
        };

        fakeModels['basic.activity'] = {
          collectionName: 'components_basic_activities',
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
          query: jest.fn(() => fakeQuery),
          db: {
            ...fakeDB,
            dialect: {
              client: 'sqlite',
            },
          },
        };

        global.strapi = {
          ...global.strapi,
          ...fakeStrapi,
        } as any;

        instance = createEntityService({
          strapi: global.strapi,
          db: fakeDB,
          eventHub,
          entityValidator,
        } as any);
      });

      test('should create record with attached files', async () => {
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

        await instance.create('api::test.test-model', { data, files });

        expect(global.strapi.getModel).toBeCalled();
        expect(uploadFiles).toBeCalled();
        expect(uploadFiles).toBeCalledTimes(1);
        expect(uploadFiles).toBeCalledWith(
          'api::test.test-model',
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
      let instance: any;

      const entityUID = 'api::entity.entity';
      const relationUID = 'api::relation.relation';

      const fakeEntities: Record<string, Record<string, any>> = {
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
      const fakeModels: Record<string, Schema.ContentType> = {
        [entityUID]: {
          kind: 'collectionType',
          modelName: 'entity',
          globalId: 'entity',
          modelType: 'contentType',
          collectionName: 'entity',
          uid: entityUID,
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
          kind: 'collectionType',
          globalId: 'entity',
          modelType: 'contentType',
          modelName: 'relation',
          uid: relationUID,
          info: {
            singularName: 'relation',
            pluralName: 'relations',
            displayName: 'RELATION',
          },
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
        const fakeQuery = (key: string) => ({
          findOne: jest.fn(({ where }) => fakeEntities[key][where.id]),
          count: jest.fn(({ where }) => {
            let ret = 0;
            where.id.$in.forEach((id: string) => {
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
          ...global.strapi,
          getModel: jest.fn((uid: string) => {
            return fakeModels[uid];
          }),
          query: jest.fn((key) => fakeQuery(key)),
          db: fakeDB,
        } as any;

        instance = createEntityService({
          strapi: global.strapi,
          db: fakeDB,
          eventHub: new EventEmitter(),
          entityValidator,
        } as any);
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
          new errors.ValidationError(
            `1 relation(s) of type api::relation.relation associated with this entity do not exist`
          )
        );
      });
    });
  });
});
