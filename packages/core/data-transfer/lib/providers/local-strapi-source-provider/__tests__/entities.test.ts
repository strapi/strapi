import type { IEntity } from '../../../../types';

import { Readable, PassThrough } from 'stream';

import {
  collect,
  getStrapiFactory,
  getContentTypes,
  createMockedQueryBuilder,
} from '../../../__tests__/test-utils';
import { createEntitiesStream, createEntitiesTransformStream } from '../entities';

describe('Local Strapi Source Provider - Entities Streaming', () => {
  describe('Create Entities Stream', () => {
    test('Should return an empty stream if there is no content type', async () => {
      const customContentTypes = {};
      const queryBuilder = createMockedQueryBuilder({});

      const strapi = getStrapiFactory({
        contentTypes: customContentTypes,
        db: { queryBuilder },
      })();

      const entitiesStream = createEntitiesStream(strapi);

      // The returned value should be a Readable stream instance
      expect(entitiesStream).toBeInstanceOf(Readable);

      const entities = await collect<IEntity<never>>(entitiesStream);

      // The stream should not have been called since there is no content types
      // Note: This check must happen AFTER we've collected the results
      expect(queryBuilder).not.toHaveBeenCalled();

      // We have 0 * 0 entities
      expect(entities).toHaveLength(0);
    });

    test('Should return a stream with 4 entities from 2 content types', async () => {
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

      const strapi = getStrapiFactory({
        contentTypes: getContentTypes(),
        db: { queryBuilder },
      })();

      const entitiesStream = createEntitiesStream(strapi);

      // The returned value should be a Readable stream instance
      expect(entitiesStream).toBeInstanceOf(Readable);

      const results = await collect(entitiesStream);

      // Should have been called with 'foo', then 'bar'
      // Note: This check must happen AFTER we've collected the results
      expect(queryBuilder).toHaveBeenCalledTimes(2);
      // We have 2 * 2 entities
      expect(results).toHaveLength(4);

      const matchContentTypeUIDs = new RegExp(`(${Object.keys(getContentTypes()).join('|')})`);

      // Each result should contain the entity and its parent content type
      results.forEach((result) => {
        expect(result).toMatchObject(
          expect.objectContaining({
            entity: expect.objectContaining({
              id: expect.any(Number),
            }),
            contentType: expect.objectContaining({
              uid: expect.stringMatching(matchContentTypeUIDs),
              attributes: expect.any(Object),
            }),
          })
        );
      });
    });
  });

  describe('Create Entities Transform Stream', () => {
    test('Should transform entities to the Strapi Data Transfer Format', async () => {
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
      const matchContentTypeUIDs = new RegExp(
        `(${Object.values(entities)
          .map((entity) => entity.contentType.uid)
          .join('|')})`
      );

      const entitiesStream = Readable.from(entities);
      const transformStream = createEntitiesTransformStream();

      expect(transformStream).toBeInstanceOf(PassThrough);

      // Connect the data source to the transformation stream
      const pipeline = entitiesStream.pipe(transformStream);

      const transformedEntities = await collect(pipeline);

      // Check the amount of transformed entities matches the initial amount
      expect(transformedEntities).toHaveLength(entities.length);

      // Each result should contain a type (uid), and id and some data
      transformedEntities.forEach((entity) => {
        expect(entity).toMatchObject(
          expect.objectContaining({
            type: expect.stringMatching(matchContentTypeUIDs),
            id: expect.any(Number),
            data: expect.any(Object),
          })
        );
      });
    });
  });
});
