import fp from 'lodash/fp.js';
import { objectType, nonNull } from 'nexus';
import type { Schema } from '@strapi/types';
import type { Context } from '../types';

const { defaultTo, prop, pipe } = fp;

export default ({ strapi }: Context) => {
  const { naming } = strapi.plugin('graphql').service('utils');

  return {
    /**
     * Build a type definition for a content API relation's collection response for a given content type
     */
    buildRelationResponseCollectionDefinition(contentType: Schema.ContentType) {
      const name = naming.getRelationResponseCollectionName(contentType);
      const typeName = naming.getTypeName(contentType);

      return objectType({
        name,

        definition(t) {
          t.nonNull.list.field('nodes', {
            type: nonNull(typeName),

            resolve: pipe(prop('nodes'), defaultTo([])),
          });

          if (strapi.plugin('graphql').config('v4CompatibilityMode', false)) {
            t.nonNull.list.field('data', {
              deprecation: 'Use `nodes` field instead',
              type: nonNull(typeName),
              resolve: pipe(prop('nodes'), defaultTo([])),
            });
          }
        },
      });
    },
  };
};
