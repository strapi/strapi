import { Readable } from 'stream';
import type { IEntity } from '../../../../../types';

import {
  collect,
  createMockedQueryBuilder,
  getStrapiFactory,
} from '../../../../__tests__/test-utils';
import { createLocalStrapiSourceProvider } from '..';

describe('Local Strapi Source Provider', () => {
  describe('Bootstrap', () => {
    test('Should not have a defined Strapi instance if bootstrap has not been called', () => {
      const provider = createLocalStrapiSourceProvider({ getStrapi: getStrapiFactory() });

      expect(provider.strapi).not.toBeDefined();
    });

    test('Should have a defined Strapi instance if bootstrap has been called', async () => {
      const provider = createLocalStrapiSourceProvider({ getStrapi: getStrapiFactory() });
      await provider.bootstrap();

      expect(provider.strapi).toBeDefined();
    });
  });

  describe('Close', () => {
    test('Should destroy the strapi instance if autoDestroy is undefined ', async () => {
      const destroy = jest.fn();

      const provider = createLocalStrapiSourceProvider({
        getStrapi: getStrapiFactory({ destroy }),
      });

      await provider.bootstrap();
      await provider.close();

      expect(destroy).toHaveBeenCalledTimes(1);
    });

    test('Should destroy the strapi instance if autoDestroy is true ', async () => {
      const destroy = jest.fn();

      const provider = createLocalStrapiSourceProvider({
        getStrapi: getStrapiFactory({ destroy }),
        autoDestroy: true,
      });

      await provider.bootstrap();
      await provider.close();

      expect(destroy).toHaveBeenCalledTimes(1);
    });

    test('Should destroy the strapi instance if autoDestroy is false ', async () => {
      const destroy = jest.fn();

      const provider = createLocalStrapiSourceProvider({
        getStrapi: getStrapiFactory({ destroy }),
        autoDestroy: false,
      });

      await provider.bootstrap();
      await provider.close();

      expect(destroy).not.toHaveBeenCalled();
    });
  });

  describe('Streaming Entities', () => {
    test('Should throw an error if strapi is not defined', async () => {
      const provider = createLocalStrapiSourceProvider({ getStrapi: getStrapiFactory() });

      await expect(() => provider.createEntitiesReadStream()).rejects.toThrowError(
        'Not able to stream entities. Strapi instance not found'
      );
    });

    test('Should successfully create a readable stream with all available entities', async () => {
      const contentTypes = {
        foo: { uid: 'foo', attributes: { title: { type: 'string' } } },
        bar: { uid: 'bar', attributes: { age: { type: 'number' } } },
      };

      const queryBuilder = createMockedQueryBuilder({
        foo: [
          { id: 1, title: 'First title' },
          { id: 2, title: 'Second title' },
        ],
        bar: [
          { id: 1, age: 42 },
          { id: 2, age: 84 },
        ],
      });

      const provider = createLocalStrapiSourceProvider({
        getStrapi: getStrapiFactory({
          contentTypes,
          db: {
            queryBuilder,
          },
          getModel: jest.fn((uid) => {
            return contentTypes[uid];
          }),
        }),
      });

      await provider.bootstrap();

      const entitiesStream = (await provider.createEntitiesReadStream()) as Readable;
      const entities = await collect<IEntity>(entitiesStream);

      // Should have been called with 'foo', then 'bar'
      expect(queryBuilder).toHaveBeenCalledTimes(2);
      // The returned value should be a Readable stream instance
      expect(entitiesStream).toBeInstanceOf(Readable);
      // We have 2 * 2 entities
      expect(entities).toHaveLength(4);
      // Each entity should follow the transfer format
      entities.forEach((entity) => {
        expect(entity).toMatchObject({
          type: expect.any(String),
          id: expect.any(Number),
          data: expect.any(Object),
        });
      });
    });
  });

  describe('Streaming Schemas', () => {
    test('Should successfully create a readable stream with all Schemas', async () => {
      const contentTypes = {
        foo: { uid: 'foo', attributes: { title: { type: 'string' } } },
        bar: { uid: 'bar', attributes: { age: { type: 'number' } } },
      };

      const components = {
        'basic.simple': {
          collectionName: 'components_basic_simples',
          info: { displayName: 'simple', icon: 'ambulance', description: '' },
          options: {},
          attributes: { name: { type: 'string' } },
          uid: 'basic.simple',
          modelType: 'component',
          modelName: 'simple',
          globalId: 'ComponentBasicSimple',
        },
        'blog.test-como': {
          collectionName: 'components_blog_test_comos',
          info: {
            displayName: 'test comp',
            icon: 'air-freshener',
            description: '',
          },
          options: {},
          attributes: { name: { type: 'string' } },
          uid: 'blog.test-como',
          modelType: 'component',
          modelName: 'test-como',
          globalId: 'ComponentBlogTestComo',
        },
      };

      const provider = createLocalStrapiSourceProvider({
        getStrapi: getStrapiFactory({
          contentTypes,
          components,
        }),
      });

      await provider.bootstrap();

      const schemasStream = provider.createSchemasReadStream();
      const schemas = await collect(schemasStream);

      expect(schemasStream).toBeInstanceOf(Readable);
      expect(schemas).toHaveLength(4);

      expect(schemas).toEqual([
        { uid: 'foo', attributes: { title: { type: 'string' } } },
        { uid: 'bar', attributes: { age: { type: 'number' } } },
        {
          collectionName: 'components_basic_simples',
          info: { displayName: 'simple', icon: 'ambulance', description: '' },
          options: {},
          attributes: { name: { type: 'string' } },
          uid: 'basic.simple',
          modelType: 'component',
          modelName: 'simple',
          globalId: 'ComponentBasicSimple',
        },
        {
          collectionName: 'components_blog_test_comos',
          info: {
            displayName: 'test comp',
            icon: 'air-freshener',
            description: '',
          },
          options: {},
          attributes: { name: { type: 'string' } },
          uid: 'blog.test-como',
          modelType: 'component',
          modelName: 'test-como',
          globalId: 'ComponentBlogTestComo',
        },
      ]);
    });
  });
});
