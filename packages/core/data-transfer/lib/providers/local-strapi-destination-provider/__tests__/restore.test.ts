import { deleteRecords } from '../strategies/restore';
import { getStrapiFactory, getContentTypes, setGlobalStrapi } from '../../test-utils';

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
];

const deleteMany = (uid: string) =>
  jest.fn(async () => ({
    count: entities.filter((entity) => entity.contentType.uid === uid).length,
  }));

const findMany = (uid: string) => {
  return jest.fn(async () => entities.filter((entity) => entity.contentType.uid === uid));
};

const getModel = jest.fn((uid: string) => getContentTypes()[uid]);

const query = jest.fn((uid) => {
  return {
    deleteMany: deleteMany(uid),
    findMany: findMany(uid),
  };
});

describe('Restore ', () => {
  test('Should delete all contentTypes', async () => {
    const strapi = getStrapiFactory({
      contentTypes: getContentTypes(),
      query,
      getModel,
      db: { query },
    })();

    setGlobalStrapi(strapi);

    const { count } = await deleteRecords(strapi, {
      /* @ts-ignore: disable-next-line */
      contentTypes: Object.values(getContentTypes()),
    });
    expect(count).toBe(entities.length);
  });

  test('Should only delete chosen contentType', async () => {
    const strapi = getStrapiFactory({
      contentTypes: getContentTypes(),
      query,
      getModel,
      db: { query },
    })();

    setGlobalStrapi(strapi);

    const { count } = await deleteRecords(strapi, {
      entities: {
        include: ['foo'],
      },
    });
    expect(count).toBe(3);
  });
});
