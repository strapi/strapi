import { prop } from 'lodash/fp';
import { ContentType } from '../../types/schema';
import { StrapiCTX } from '../../types/strapi-ctx';
import { builder } from './pothosBuilder';

export default ({ strapi }: StrapiCTX) => {
  const { naming } = strapi.plugin('graphql').service('utils');

  return {
    /**
     * Build a type definition for a content API response for a given content type
     */
    buildResponseDefinition(contentType: ContentType) {
      const name = naming.getEntityResponseName(contentType);
      const entityName = naming.getEntityName(contentType);

      return builder.objectType(name, {
        fields(t) {
          return {
            data: t.field({
              type: entityName,

              resolve: prop('value'),
            }),
          };
        },
      });
    },
  };
};
