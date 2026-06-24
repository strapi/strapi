import fp from 'lodash/fp.js';
import { objectType } from 'nexus';
import type { Schema } from '@strapi/types';

import type { Context } from '../types';

const { prop, identity, isEmpty } = fp;

export default ({ strapi }: Context) => {
  const { naming } = strapi.plugin('graphql').service('utils');

  return {
    /**
     * Build a higher level type for a content type which contains the attributes, the ID and the metadata
     * @param {object} contentType The content type which will be used to build its entity type
     * @return {NexusObjectTypeDef}
     */
    buildEntityDefinition(contentType: Schema.ContentType) {
      const { attributes } = contentType;

      const name = naming.getEntityName(contentType);
      const typeName = naming.getTypeName(contentType);

      return objectType({
        name,

        definition(t) {
          // Keep the ID attribute at the top level
          t.id('id', { resolve: prop('id') });

          if (!isEmpty(attributes)) {
            // Keep the fetched object into a dedicated `attributes` field
            t.field('attributes', {
              type: typeName,
              resolve: identity,
            });
          }
        },
      });
    },
  };
};
