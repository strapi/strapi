import type { ContentTypeSchema } from '@strapi/strapi';

import { isObject, isArray, size } from 'lodash/fp';
import { Readable, PassThrough } from 'stream';

/**
 * Generate and consume content-types streams in order to stream each entity individually
 */
export const createEntitiesStream = (strapi: Strapi.Strapi): Readable => {
  const contentTypes: ContentTypeSchema[] = Object.values(strapi.contentTypes);

  async function* contentTypeStreamGenerator() {
    for (const contentType of contentTypes) {
      const stream: Readable = strapi.db
        // Create a query builder instance (default type is 'select')
        .queryBuilder(contentType.uid)
        // Apply the populate
        .populate(getPopulateAttributes(strapi, contentType))
        // Get a readable stream
        .stream();

      yield { contentType, stream };
    }
  }

  return Readable.from(
    (async function* () {
      for await (const { stream, contentType } of contentTypeStreamGenerator()) {
        for await (const entity of stream) {
          yield { entity, contentType };
        }

        stream.destroy();
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

/**
 * Get the list of attributes that needs to be populated for the entities streaming
 */
const getPopulateAttributes = (strapi: Strapi.Strapi, contentType: ContentTypeSchema) => {
  const { attributes } = contentType;

  const populate: any = {};

  const entries: [string, any][] = Object.entries(attributes);

  for (const [key, attribute] of entries) {
    if (attribute.type === 'component') {
      const component = strapi.getModel(attribute.component);
      const subPopulate = getPopulateAttributes(strapi, component);

      if ((isArray(subPopulate) || isObject(subPopulate)) && size(subPopulate) > 0) {
        populate[key] = { populate: subPopulate };
      }

      if (subPopulate === true) {
        populate[key] = true;
      }
    }

    if (attribute.type === 'dynamiczone') {
      const { components: componentsUID } = attribute;

      const on: any = {};

      for (const componentUID of componentsUID) {
        const component = strapi.getModel(componentUID);
        const componentPopulate = getPopulateAttributes(strapi, component);

        on[componentUID] = { populate: componentPopulate };
      }

      populate[key] = size(on) > 0 ? { on } : true;
    }
  }

  const values = Object.values(populate);

  if (values.length === 0) {
    return true;
  }

  if (values.every((value) => value === true)) {
    return Object.keys(populate);
  }

  return populate;
};
