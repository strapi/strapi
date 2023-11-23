import { objectType, nonNull } from 'nexus';
import { defaultTo, prop, pipe } from 'lodash/fp';
import type { Schema } from '@strapi/types';
import type { Context } from '../types';

export default ({ strapi }: Context) => {
  const { naming } = strapi.plugin('graphql').service('utils');
  const { RESPONSE_COLLECTION_META_TYPE_NAME } = strapi.plugin('graphql').service('constants');

  return {
    /**
     * Build a type definition for a content API collection response for a given content type
     * @param {Schema.ContentType} contentType The content type which will be used to build its content API response definition
     * @return {NexusObjectTypeDef}
     */
    buildResponseCollectionDefinition(contentType: Schema.ContentType) {
      const name = naming.getEntityResponseCollectionName(contentType);
      const entityName = naming.getEntityName(contentType);

      return objectType({
        name,

        definition(t) {
          t.nonNull.list.field('data', {
            type: nonNull(entityName),

            resolve: pipe(prop('nodes'), defaultTo([])),
          });

          t.nonNull.field('meta', {
            type: RESPONSE_COLLECTION_META_TYPE_NAME,

            // Pass down the args stored in the source object
            resolve: prop('info'),
          });
        },
      });
    },
  };
};
