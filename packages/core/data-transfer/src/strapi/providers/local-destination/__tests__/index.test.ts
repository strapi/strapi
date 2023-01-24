import { createLocalStrapiDestinationProvider } from '../index';
import * as restoreApi from '../strategies/restore';
import {
  getStrapiFactory,
  getContentTypes,
  setGlobalStrapi,
} from '../../../../__tests__/test-utils';

afterEach(() => {
  jest.clearAllMocks();
});

jest.mock('../strategies/restore', () => {
  return {
    __esModule: true,
    ...jest.requireActual('../strategies/restore'),
  };
});

const transaction = jest.fn(async (cb) => {
  const trx = {};
  const rollback = jest.fn();
  // eslint-disable-next-line node/no-callback-literal
  await cb({ trx, rollback });
});

describe('Local Strapi Source Destination', () => {
  describe('Bootstrap', () => {
    test('Should not have a defined Strapi instance if bootstrap has not been called', () => {
      const provider = createLocalStrapiDestinationProvider({
        getStrapi: getStrapiFactory({
          db: { transaction },
        }),
        strategy: 'restore',
      });

      expect(provider.strapi).not.toBeDefined();
    });

    test('Should have a defined Strapi instance if bootstrap has been called', async () => {
      const provider = createLocalStrapiDestinationProvider({
        getStrapi: getStrapiFactory({
          db: { transaction },
        }),
        strategy: 'restore',
      });
      await provider.bootstrap();

      expect(provider.strapi).toBeDefined();
    });
  });

  describe('Strategy', () => {
    test('requires strategy to be either restore or merge', async () => {
      const restoreProvider = createLocalStrapiDestinationProvider({
        getStrapi: getStrapiFactory({
          db: { transaction },
        }),
        strategy: 'restore',
      });
      await restoreProvider.bootstrap();
      expect(restoreProvider.strapi).toBeDefined();

      const mergeProvider = createLocalStrapiDestinationProvider({
        getStrapi: getStrapiFactory({
          db: { transaction },
        }),
        strategy: 'merge',
      });
      await mergeProvider.bootstrap();
      expect(mergeProvider.strapi).toBeDefined();

      await expect(
        (async () => {
          const invalidProvider = createLocalStrapiDestinationProvider({
            getStrapi: getStrapiFactory({
              db: { transaction },
            }),
            /* @ts-ignore: disable-next-line */
            strategy: 'foo',
          });
          await invalidProvider.bootstrap();
        })()
      ).rejects.toThrow();
    });

    test('Should delete all entities if it is a restore', async () => {
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

      const query = jest.fn((uid) => {
        return {
          deleteMany: deleteMany(uid),
          findMany: findMany(uid),
        };
      });

      const getModel = jest.fn((uid: string) => getContentTypes()[uid]);

      const strapi = getStrapiFactory({
        contentTypes: getContentTypes(),
        query,
        getModel,
        db: { query, transaction },
      })();

      setGlobalStrapi(strapi);

      const provider = createLocalStrapiDestinationProvider({
        getStrapi: () => strapi,
        strategy: 'restore',
      });
      const deleteAllSpy = jest.spyOn(restoreApi, 'deleteRecords');
      await provider.bootstrap();
      await provider.beforeTransfer();

      expect(deleteAllSpy).toBeCalledTimes(1);
    });

    test('Should not delete if it is a merge strategy', async () => {
      const provider = createLocalStrapiDestinationProvider({
        getStrapi: getStrapiFactory({
          db: {
            transaction,
          },
        }),
        strategy: 'merge',
      });
      const deleteAllSpy = jest.spyOn(restoreApi, 'deleteRecords');
      await provider.bootstrap();
      await provider.beforeTransfer();

      expect(deleteAllSpy).not.toBeCalled();
    });
  });
});
