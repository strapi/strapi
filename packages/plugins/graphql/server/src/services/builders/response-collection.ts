import { objectType, nonNull } from 'nexus';
import { defaultTo, prop, pipe, identity } from 'lodash/fp';
import type { Schema } from '@strapi/types';
import type { Context } from '../types';

export default ({ strapi }: Context) => {
  const { service: getService } = strapi.plugin('graphql');

  const { naming } = getService('utils');
  const { RESPONSE_COLLECTION_META_TYPE_NAME, PAGINATION_TYPE_NAME } = getService('constants');

  return {
    /**
     * Build a type definition for a content API collection response for a given content type
     * @param {Schema.ContentType} contentType The content type which will be used to build its content API response definition
     * @return {NexusObjectTypeDef}
     */
    buildResponseCollectionDefinition(contentType: Schema.ContentType) {
      const name = naming.getEntityResponseCollectionName(contentType);
      const typeName = naming.getTypeName(contentType);
      const { resolvePagination } = getService('builders').get('content-api');

      return objectType({
        name,
        definition(t) {
          // NOTE: add edges & cursor based pagination to support the relay spec in a later version

          t.nonNull.list.field('nodes', {
            type: nonNull(typeName),
            resolve: pipe(prop('nodes'), defaultTo([])),
          });

          t.nonNull.field('pageInfo', {
            type: PAGINATION_TYPE_NAME,
            resolve: resolvePagination,
          });

          if (strapi.plugin('graphql').config('v4CompatibilityMode', false)) {
            t.nonNull.list.field('data', {
              deprecation: 'Use `nodes` field instead',
              type: nonNull(typeName),
              resolve: pipe(prop('nodes'), defaultTo([])),
            });

            t.nonNull.field('meta', {
              deprecation: 'Use the `pageInfo` field instead',
              type: RESPONSE_COLLECTION_META_TYPE_NAME,
              resolve: identity,
            });
          }
        },
      });
    },
  };
};
