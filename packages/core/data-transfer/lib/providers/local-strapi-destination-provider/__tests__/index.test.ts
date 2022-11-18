import { createLocalStrapiDestinationProvider } from '../index';
import { getStrapiFactory, getContentTypes } from '../../test-utils';

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
      const query = jest.fn((uid: string) => {
        return {
          deleteMany: async () => ({
            count: entities.filter((entity) => entity.contentType.uid === uid).length,
          }),
        };
      });
      const provider = createLocalStrapiDestinationProvider({
        getStrapi: getStrapiFactory({
          contentTypes: getContentTypes(),
          db: {
            query,
          },
        }),
        strategy: 'restore',
      });
      const deleteAllSpy = jest.spyOn(provider, 'deleteAll');
      await provider.bootstrap();
      await provider.beforeStreaming();

      expect(deleteAllSpy).toBeCalledTimes(1);
      expect((await provider.deleteAll()).count).toBe(entities.length);
    });

    test('Should not delete exceptions if it is a restore', async () => {
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
      const query = jest.fn((uid: string) => {
        return {
          deleteMany: async () => ({
            count: entities.filter((entity) => entity.contentType.uid === uid).length,
          }),
        };
      });
      const provider = createLocalStrapiDestinationProvider({
        getStrapi: getStrapiFactory({
          contentTypes: getContentTypes(),
          db: {
            query,
          },
        }),
        strategy: 'restore',
        restore: {
          exceptions: ['foo'],
        },
      });
      const deleteAllSpy = jest.spyOn(provider, 'deleteAll');
      await provider.bootstrap();
      await provider.beforeStreaming();

      expect(deleteAllSpy).toBeCalledTimes(1);
      expect((await provider.deleteAll()).count).toBe(4);
    });

    test('Should not delete if it is a merge strategy', async () => {
      const provider = createLocalStrapiDestinationProvider({
        getStrapi: getStrapiFactory({}),
        strategy: 'merge',
      });
      const deleteAllSpy = jest.spyOn(provider, 'deleteAll');
      await provider.bootstrap();
      await provider.beforeStreaming();

      expect(deleteAllSpy).not.toBeCalled();
    });
  });
});
