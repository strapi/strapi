import type { ContentTypeSchema, GetAttributesValues, RelationsType } from '@strapi/strapi';

import { Duplex } from 'stream';
import { castArray } from 'lodash/fp';

import { getDeepPopulateQuery, parseEntityLinks } from './utils';

/**
 * Create a Duplex instance which will stream all the links from a Strapi instance
 */
export const createLinksStream = (strapi: Strapi.Strapi): Duplex => {
  const schemas: ContentTypeSchema[] = Object.values(strapi.contentTypes);

  // Destroy the Duplex stream instance
  const destroy = (): void => {
    if (!stream.destroyed) {
      stream.destroy();
    }
  };

  // Async generator stream that returns every link from a Strapi instance
  const stream = Duplex.from(async function* () {
    for (const schema of schemas) {
      const populate = getDeepPopulateQuery(schema, strapi);
      const query = { fields: ['id'], populate };

      // TODO: Replace with the DB stream API
      const results = await strapi.entityService.findMany(schema.uid, query);

      for (const entity of castArray(results)) {
        const links = parseEntityLinks(entity, populate, schema, strapi);

        for (const link of links) {
          yield link;
        }
      }
    }

    destroy();
  });

  return stream;
};
