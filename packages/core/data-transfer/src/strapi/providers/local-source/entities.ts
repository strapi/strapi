import type { ContentTypeSchema } from '@strapi/strapi';

import { Readable, PassThrough } from 'stream';
import * as shared from '../../queries';
import { IEntity } from '../../../../types';

/**
 * Generate and consume content-types streams in order to stream each entity individually
 */
export const createEntitiesStream = (strapi: Strapi.Strapi): Readable => {
  const contentTypes: ContentTypeSchema[] = Object.values(strapi.contentTypes);

  async function* contentTypeStreamGenerator() {
    for (const contentType of contentTypes) {
      const query = shared.entity.createEntityQuery(strapi).call(null, contentType.uid);

      const stream: Readable = strapi.db
        // Create a query builder instance (default type is 'select')
        .queryBuilder(contentType.uid)
        // Fetch all columns
        .select('*')
        // Apply the populate
        .populate(query.deepPopulateComponentLikeQuery)
        // Get a readable stream
        .stream();

      yield { contentType, stream };
    }
  }

  return Readable.from(
    (async function* entitiesGenerator(): AsyncGenerator<{
      entity: IEntity;
      contentType: ContentTypeSchema;
    }> {
      for await (const { stream, contentType } of contentTypeStreamGenerator()) {
        try {
          for await (const entity of stream) {
            yield { entity, contentType };
          }
        } catch {
          // ignore
        } finally {
          stream.destroy();
        }
      }
    })()
  );
};

/**
 * Create an entity transform stream which convert the output of
 * the multi-content-types stream to the transfer entity format
 */
export const createEntitiesTransformStream = (): PassThrough => {
  return new PassThrough({
    objectMode: true,
    transform(data, _encoding, callback) {
      const { entity, contentType } = data;
      const { id, ...attributes } = entity;

      callback(null, {
        type: contentType.uid,
        id,
        data: attributes,
      });
    },
  });
};
