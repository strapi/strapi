import { objectType, nonNull } from 'nexus';
import { defaultTo, prop, pipe } from 'lodash/fp';
import type { Schema } from '@strapi/types';
import type { Context } from '../types';

export default ({ strapi }: Context) => {
  const { naming } = strapi.plugin('graphql').service('utils');

  return {
    /**
     * Build a type definition for a content API relation's collection response for a given content type
     */
    buildRelationResponseCollectionDefinition(contentType: Schema.ContentType) {
      const name = naming.getRelationResponseCollectionName(contentType);
      const entityName = naming.getEntityName(contentType);

      return objectType({
        name,

        definition(t) {
          t.nonNull.list.field('data', {
            type: nonNull(entityName),

            resolve: pipe(prop('nodes'), defaultTo([])),
          });
        },
      });
    },
  };
};
