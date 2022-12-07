import { defaultTo, prop, pipe } from 'lodash/fp';
import { ContentType } from '../../types/schema';
import { StrapiCTX } from '../../types/strapi-ctx';
import { builder } from './pothosBuilder';

export default ({ strapi }: StrapiCTX) => {
  const { naming } = strapi.plugin('graphql').service('utils');

  return {
    /**
     * Build a type definition for a content API relation's collection response for a given content type
     */
    buildRelationResponseCollectionDefinition(contentType: ContentType) {
      const name = naming.getRelationResponseCollectionName(contentType);
      const entityName = naming.getEntityName(contentType);

      return builder.objectType(name, {
        fields(t) {
          return {
            data: t.field({
              type: [entityName],
              nullable: false,
              resolve: pipe(prop('nodes'), defaultTo([])),
            }),
          };
        },
      });
    },
  };
};
