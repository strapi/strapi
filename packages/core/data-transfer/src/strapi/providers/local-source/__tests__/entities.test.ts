import { Readable, Transform } from 'stream';
import type { IEntity } from '../../../../types';

import {
  collect,
  getStrapiFactory,
  getContentTypes,
  createMockedQueryBuilder,
} from '../../../../__tests__/test-utils';
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

      const entities = await collect<IEntity>(entitiesStream);

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
      const contentTypes = getContentTypes();
      const strapi = getStrapiFactory({
        contentTypes,
        db: { queryBuilder },
        getModel: jest.fn((uid) => {
          return contentTypes[uid];
        }),
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

    test('Should warn and continue with the next content type when a stream fails', async () => {
      const queryBuilder = jest.fn((uid: string) => ({
        select() {
          return this;
        },
        populate() {
          return this;
        },
        stream() {
          if (uid === 'foo') {
            // Stream one entity, then fail mid-stream
            return Readable.from(
              (async function* fooGenerator() {
                yield { id: 1, title: 'First title' };
                throw new Error('connection lost');
              })()
            );
          }

          return Readable.from([
            { id: 1, age: 42 },
            { id: 2, age: 84 },
          ]);
        },
      }));

      const contentTypes = getContentTypes();
      const strapi = getStrapiFactory({
        contentTypes,
        db: { queryBuilder },
        getModel: jest.fn((uid) => {
          return contentTypes[uid];
        }),
      })();

      const onWarning = jest.fn();
      const entitiesStream = createEntitiesStream(strapi, { onWarning });

      const results = await collect(entitiesStream);

      // The first "foo" entity was streamed before the failure, and both
      // "bar" entities must still be streamed afterwards
      expect(results).toHaveLength(3);

      // The failure must be reported instead of silently swallowed
      expect(onWarning).toHaveBeenCalledTimes(1);
      expect(onWarning).toHaveBeenCalledWith(expect.stringContaining('"foo"'));
      expect(onWarning).toHaveBeenCalledWith(expect.stringContaining('connection lost'));
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

      expect(transformStream).toBeInstanceOf(Transform);

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
