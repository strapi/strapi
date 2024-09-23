import { omit } from 'lodash/fp';
import { deleteRecords, restoreConfigs } from '../strategies/restore';
import {
  getStrapiFactory,
  getContentTypes,
  setGlobalStrapi,
  getStrapiModels,
} from '../../../../__tests__/test-utils';
import { IConfiguration } from '../../../../../types';

const entities = [
  {
    entity: { id: 1, title: 'My first foo' },
    contentType: { uid: 'foo' },
  },
  {
    entity: { id: 4, title: 'Another Foo' },
    contentType: { uid: 'foo' },
  },
  {
    entity: { id: 12, title: 'Last foo' },
    contentType: { uid: 'foo' },
  },
  {
    entity: { id: 1, age: 21 },
    contentType: { uid: 'bar' },
  },
  {
    entity: { id: 2, age: 42 },
    contentType: { uid: 'bar' },
  },
  {
    entity: { id: 7, age: 84 },
    contentType: { uid: 'bar' },
  },
  {
    entity: { id: 9, age: 0 },
    contentType: { uid: 'bar' },
  },
  {
    entity: { id: 10, age: 0 },
    model: { uid: 'model::foo' },
  },
  {
    entity: { id: 11, age: 0 },
    model: { uid: 'model::bar' },
  },
];

afterEach(() => {
  jest.clearAllMocks();
});

const deleteMany = (uid: string) =>
  jest.fn(async () => ({
    count: entities.filter((entity) => {
      if (entity.model) {
        return entity.model.uid === uid;
      }

      return entity.contentType.uid === uid;
    }).length,
  }));

const findMany = (uid: string) => {
  return jest.fn(async () =>
    entities.filter((entity) => {
      if (entity.model) {
        return entity.model.uid === uid;
      }

      return entity.contentType.uid === uid;
    })
  );
};

const create = jest.fn((data) => data);

const getModel = jest.fn((uid: string) => getContentTypes()[uid]);

const query = jest.fn((uid) => {
  return {
    deleteMany: deleteMany(uid),
    findMany: findMany(uid),
    create,
  };
});

describe('Restore ', () => {
  test('Should delete all models and contentTypes', async () => {
    const strapi = getStrapiFactory({
      contentTypes: getContentTypes(),
      query,
      getModel,
      get() {
        return {
          get() {
            return getStrapiModels();
          },
        };
      },
      db: {
        query,
      },
    })();

    setGlobalStrapi(strapi);

    const { count } = await deleteRecords(strapi);
    expect(count).toBe(entities.length);
  });

  test('Should only delete chosen contentType', async () => {
    const strapi = getStrapiFactory({
      contentTypes: getContentTypes(),
      query,
      getModel,
      get() {
        return {
          get() {
            return getStrapiModels();
          },
        };
      },
      db: {
        query,
      },
    })();

    setGlobalStrapi(strapi);

    const { count } = await deleteRecords(strapi, {
      entities: {
        include: ['foo'],
      },
    });
    expect(count).toBe(3);
  });

  test('Should only delete chosen model ', async () => {
    const strapi = getStrapiFactory({
      contentTypes: getContentTypes(),
      query,
      getModel,
      get() {
        return {
          get() {
            return getStrapiModels();
          },
        };
      },
      db: {
        query,
      },
    })();

    setGlobalStrapi(strapi);

    const { count } = await deleteRecords(strapi, {
      entities: {
        include: ['model::foo'],
      },
    });

    expect(count).toBe(1);
  });

  test('Should add core store data', async () => {
    const strapi = getStrapiFactory({
      contentTypes: getContentTypes(),
      db: {
        query,
      },
    })();
    const config: IConfiguration<{
      key: string;
      type: string;
      environment: null;
      tag: string;
      value: object;
    }> = {
      type: 'core-store',
      value: {
        key: 'test-key',
        type: 'test-type',
        environment: null,
        tag: 'tag',
        value: {},
      },
    };
    const result = await restoreConfigs(strapi, config);

    expect(strapi.db.query).toBeCalledTimes(1);
    expect(strapi.db.query).toBeCalledWith('strapi::core-store');
    expect(result.data).toMatchObject(config.value);
  });

  test('Should add webhook data', async () => {
    const strapi = getStrapiFactory({
      contentTypes: getContentTypes(),
      db: {
        query,
      },
    })();

    const config: IConfiguration<{
      id: number;
      name: string;
      url: string;
      headers: Record<string, unknown>;
      events: string[];
      enabled: boolean;
    }> = {
      type: 'webhook',
      value: {
        id: 4,
        name: 'christian',
        url: 'https://facebook.com',
        headers: { null: '' },
        events: [
          'entry.create',
          'entry.update',
          'entry.delete',
          'entry.publish',
          'entry.unpublish',
          'media.create',
          'media.update',
          'media.delete',
        ],
        enabled: true,
      },
    };
    const result = await restoreConfigs(strapi, config);
    expect(strapi.db.query).toBeCalledTimes(1);
    expect(strapi.db.query).toBeCalledWith('strapi::webhook');
    expect(result.data).toMatchObject(omit(['id'])(config.value));
  });
});
