import { deleteAllRecords } from '../restore';
import { getStrapiFactory, getContentTypes } from '../../test-utils';

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

const deleteMany = jest.fn(async (uid: string) => ({
  count: entities.filter((entity) => entity.contentType.uid === uid).length,
}));

const query = jest.fn(() => {
  return {
    deleteMany: jest.fn(() => ({
      count: 0,
    })),
  };
});

describe('Restore ', () => {
  test('Should delete all contentTypes', async () => {
    const strapi = getStrapiFactory({
      contentTypes: getContentTypes(),
      entityService: {
        deleteMany,
      },
      query,
    })();

    const { count } = await deleteAllRecords(strapi, {
      /* @ts-ignore: disable-next-line */
      contentTypes: Object.values(getContentTypes()),
    });
    expect(count).toBe(entities.length);
  });

  test('Should only delete chosen contentType', async () => {
    const strapi = getStrapiFactory({
      contentTypes: getContentTypes(),
      entityService: {
        deleteMany,
      },
      query,
    })();

    const { count } = await deleteAllRecords(strapi, {
      /* @ts-ignore: disable-next-line */
      contentTypes: [getContentTypes()['foo']],
    });
    expect(count).toBe(3);
  });
});
