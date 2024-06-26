import { objectType } from 'nexus';
import { prop } from 'lodash/fp';
import type { Schema } from '@strapi/types';
import type { Context } from '../types';

export default ({ strapi }: Context) => {
  const { naming } = strapi.plugin('graphql').service('utils');

  return {
    /**
     * Build a type definition for a content API response for a given content type
     */
    buildResponseDefinition(contentType: Schema.ContentType) {
      const name = naming.getEntityResponseName(contentType);
      const entityName = naming.getEntityName(contentType);

      return objectType({
        name,

        definition(t) {
          t.field('data', {
            type: entityName,

            resolve: prop('value'),
          });
        },
      });
    },
  };
};
