import { StrapiCTX } from '../../types/strapi-ctx';

import { prop, identity, isEmpty } from 'lodash/fp';
import { builder } from './pothosBuilder';
import { ContentType } from '../../types/schema';

export default ({ strapi }: StrapiCTX) => {
  const { naming } = strapi.plugin('graphql').service('utils');

  return {
    /**
     * Build a higher level type for a content type which contains the attributes, the ID and the metadata
     */
    buildEntityDefinition(contentType: ContentType) {
      const { attributes } = contentType;

      const name = naming.getEntityName(contentType);
      const typeName = naming.getTypeName(contentType);

      return builder.objectType(name, {
        fields: (t) => ({
          // Keep the ID attribute at the top level
          id: t.id({ resolve: prop('id') }),

          attributes: !isEmpty(attributes)
            ? t.field({
                type: typeName,
                resolve: identity,
              })
            : undefined,

          // todo[v4]: add the meta field to the entity when there will be data in it (can't add an empty type for now)
          // t.field('meta', { type: utils.getEntityMetaName(contentType) });
        }),
      });
    },
  };
};
