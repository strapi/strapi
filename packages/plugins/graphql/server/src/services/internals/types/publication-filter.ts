import { enumType } from 'nexus';
import type { Context } from '../../types';

export default ({ strapi }: Context) => {
  const { PUBLICATION_FILTER_TYPE_NAME } = strapi.plugin('graphql').service('constants');

  return {
    PublicationFilter: enumType({
      name: PUBLICATION_FILTER_TYPE_NAME,
      members: {
        NEVER_PUBLISHED: 'never-published',
        HAS_PUBLISHED_VERSION: 'has-published-version',
        MODIFIED: 'modified',
        UNMODIFIED: 'unmodified',
      },
    }),
  };
};
