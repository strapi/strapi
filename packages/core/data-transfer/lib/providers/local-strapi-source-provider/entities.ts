import type { ContentTypeSchema } from '@strapi/strapi';

import { Readable, Duplex, PassThrough } from 'stream';

/**
 * Generate and consume content-types streams in order to stream each entity individually
 */
export const createEntitiesStream = (strapi: Strapi.Strapi): Duplex => {
  const contentTypes: ContentTypeSchema[] = Object.values(strapi.contentTypes);

  async function* contentTypeStreamGenerator() {
    for (const contentType of contentTypes) {
      // TODO: Replace with the correct API when we'll have it
      const stream: Readable = await strapi.entityService.stream(contentType.uid, {
        populate: getContentTypeEntitiesPopulateAttributes(contentType),
      });

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
const getContentTypeEntitiesPopulateAttributes = (contentType: ContentTypeSchema) => {
  const { attributes } = contentType;

  return Object.keys(attributes).filter((key) =>
    ['component', 'dynamiczone'].includes(attributes[key].type)
  );
};
