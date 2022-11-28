import { createLocalStrapiDestinationProvider } from '../index';
import * as restoreApi from '../restore';
import { getStrapiFactory, getContentTypes } from '../../test-utils';

afterEach(() => {
  jest.clearAllMocks();
});

describe('Local Strapi Source Destination', () => {
  describe('Bootstrap', () => {
    test('Should not have a defined Strapi instance if bootstrap has not been called', () => {
      const provider = createLocalStrapiDestinationProvider({
        getStrapi: getStrapiFactory(),
        strategy: 'restore',
      });

      expect(provider.strapi).not.toBeDefined();
    });

    test('Should have a defined Strapi instance if bootstrap has been called', async () => {
      const provider = createLocalStrapiDestinationProvider({
        getStrapi: getStrapiFactory(),
        strategy: 'restore',
      });
      await provider.bootstrap();

      expect(provider.strapi).toBeDefined();
    });
  });

  describe('Strategy', () => {
    test('requires strategy to be either restore or merge', async () => {
      const restoreProvider = createLocalStrapiDestinationProvider({
        getStrapi: getStrapiFactory(),
        strategy: 'restore',
      });
      await restoreProvider.bootstrap();
      expect(restoreProvider.strapi).toBeDefined();

      const mergeProvider = createLocalStrapiDestinationProvider({
        getStrapi: getStrapiFactory(),
        strategy: 'merge',
      });
      await mergeProvider.bootstrap();
      expect(mergeProvider.strapi).toBeDefined();

      await expect(
        (async () => {
          const invalidProvider = createLocalStrapiDestinationProvider({
            getStrapi: getStrapiFactory(),
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

      const provider = createLocalStrapiDestinationProvider({
        getStrapi: getStrapiFactory({
          contentTypes: getContentTypes(),
          entityService: {
            deleteMany,
          },
          query,
        }),
        strategy: 'restore',
      });
      const deleteAllSpy = jest.spyOn(restoreApi, 'deleteAllRecords');
      await provider.bootstrap();
      await provider.beforeStreaming();

      expect(deleteAllSpy).toBeCalledTimes(1);
    });

    test('Should not delete if it is a merge strategy', async () => {
      const provider = createLocalStrapiDestinationProvider({
        getStrapi: getStrapiFactory({}),
        strategy: 'merge',
      });
      const deleteAllSpy = jest.spyOn(restoreApi, 'deleteAllRecords');
      await provider.bootstrap();
      await provider.beforeStreaming();

      expect(deleteAllSpy).not.toBeCalled();
    });
  });
});
