import type { ContentTypeSchema } from '@strapi/strapi';

import { Readable, Duplex, PassThrough } from 'stream';

/**
 * Generate and consume content-types streams in order to stream each entity individually
 */
export const createEntitiesStream = (strapi: Strapi.Strapi): Duplex => {
  const contentTypes: ContentTypeSchema[] = Object.values(strapi.contentTypes);

  async function* contentTypeStreamGenerator() {
    for (const contentType of contentTypes) {
      const stream: Readable = strapi.db
        // Create a query builder instance (default type is 'select')
        .queryBuilder(contentType.uid)
        // Apply the populate
        .populate(getPopulateAttributes(contentType))
        // Get a readable stream
        .stream();

      yield { contentType, stream };
    }
  }

  return Duplex.from(async function* () {
    for await (const { stream, contentType } of contentTypeStreamGenerator()) {
      for await (const entity of stream) {
        yield { entity, contentType };
      }

      stream.destroy();
    }
  });
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

/**
 * Get the list of attributes that needs to be populated for the entities streaming
 */
const getPopulateAttributes = (contentType: ContentTypeSchema) => {
  const { attributes } = contentType;

  return Object.keys(attributes).filter((key) =>
    ['component', 'dynamiczone'].includes(attributes[key].type)
  );
};
