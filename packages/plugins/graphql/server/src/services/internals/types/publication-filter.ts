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
        NEVER_PUBLISHED_DOCUMENT: 'never-published-document',
        HAS_PUBLISHED_VERSION_DOCUMENT: 'has-published-version-document',
        PUBLISHED_WITHOUT_DRAFT: 'published-without-draft',
        PUBLISHED_WITH_DRAFT: 'published-with-draft',
      },
    }),
  };
};
