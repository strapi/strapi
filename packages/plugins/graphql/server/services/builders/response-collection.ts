import { StrapiCTX } from '../../types/strapi-ctx';
import { defaultTo, prop, pipe } from 'lodash/fp';
import { builder } from './pothosBuilder';
import { ContentType } from '../../types/schema';

export default ({ strapi }: StrapiCTX) => {
  const { naming } = strapi.plugin('graphql').service('utils');
  const { RESPONSE_COLLECTION_META_TYPE_NAME } = strapi.plugin('graphql').service('constants');

  return {
    /**
     * Build a type definition for a content API collection response for a given content type
     */
    buildResponseCollectionDefinition(contentType: ContentType) {
      const name = naming.getEntityResponseCollectionName(contentType);
      const entityName = naming.getEntityName(contentType);

      return builder.objectType(name, {
        fields(t) {
          return {
            data: t.field({
              type: [entityName],
              nullable: false,
              resolve: pipe(prop('nodes'), defaultTo([])),
            }),
            meta: t.field({
              type: RESPONSE_COLLECTION_META_TYPE_NAME,
              nullable: false,

              // Pass down the args stored in the source object
              resolve: prop('info'),
            }),
          };
        },
      });
    },
  };
};
