import { enumType } from 'nexus';
import type { StrapiContext } from '../../types';

export default ({ strapi }: StrapiContext) => {
  const { PUBLICATION_STATUS_TYPE_NAME } = strapi.plugin('graphql').service('constants');

  return {
    /**
     * An enum type definition representing a publication status
     * @type {NexusEnumTypeDef}
     */
    PublicationStatus: enumType({
      name: PUBLICATION_STATUS_TYPE_NAME,

      members: {
        DRAFT: 'draft',
        PUBLISHED: 'published',
      },
    }),
  };
};
