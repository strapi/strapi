import { createLocalStrapiDestinationProvider } from '../index';
import * as restoreApi from '../strategies/restore';
import {
  getStrapiFactory,
  getContentTypes,
  setGlobalStrapi,
  getStrapiModels,
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

const strapiCommonProperties = {
  config: {
    get(service) {
      if (service === 'plugin::upload') {
        return { provider: 'local' };
      }
    },
  },
  dirs: {
    static: {
      public: '/assets/',
    },
  },
};

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
          ...strapiCommonProperties,
        }),
        strategy: 'restore',
        restore: {
          entities: {
            exclude: [],
          },
        },
      });

      expect(provider.strapi).not.toBeDefined();
    });

    test('Should have a defined Strapi instance if bootstrap has been called', async () => {
      const provider = createLocalStrapiDestinationProvider({
        getStrapi: getStrapiFactory({
          db: { transaction },
          ...strapiCommonProperties,
        }),
        strategy: 'restore',
        restore: {
          entities: {
            exclude: [],
          },
        },
      });
      await provider.bootstrap();

      expect(provider.strapi).toBeDefined();
    });
  });

  describe('Strategy', () => {
    test('requires strategy to be restore', async () => {
      const restoreProvider = createLocalStrapiDestinationProvider({
        getStrapi: getStrapiFactory({
          db: { transaction },
          ...strapiCommonProperties,
        }),
        strategy: 'restore',
        restore: {
          entities: {
            exclude: [],
          },
        },
      });
      await restoreProvider.bootstrap();
      expect(restoreProvider.strapi).toBeDefined();

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

    test.todo('Should not delete entities that are not included');

    test('Should delete all entities if it is a restore with only exclude property', async () => {
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
        get() {
          return {
            get() {
              return getStrapiModels();
            },
          };
        },
        db: {
          query,
          transaction,
          queryBuilder: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              stream: jest.fn().mockReturnValue([]),
              transacting: jest.fn().mockReturnThis(),
            }),
          }),
        },
        ...strapiCommonProperties,
      })();

      setGlobalStrapi(strapi);

      const provider = createLocalStrapiDestinationProvider({
        getStrapi: () => strapi,
        strategy: 'restore',
        restore: {
          entities: {
            exclude: [],
          },
        },
      });
      const deleteAllSpy = jest.spyOn(restoreApi, 'deleteRecords');
      await provider.bootstrap();
      await provider.beforeTransfer();

      expect(deleteAllSpy).toBeCalledTimes(1);
    });
  });
});
