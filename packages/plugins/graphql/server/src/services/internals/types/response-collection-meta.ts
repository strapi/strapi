import { objectType } from 'nexus';
import type { StrapiContext } from '../../types';

export default ({ strapi }: StrapiContext) => {
  const { service: getService } = strapi.plugin('graphql');

  const { RESPONSE_COLLECTION_META_TYPE_NAME, PAGINATION_TYPE_NAME } = getService('constants');

  return {
    /**
     * A shared type definition used in EntitiesResponseCollection
     * to have information about the collection as a whole
     * @type {NexusObjectTypeDef}
     */
    ResponseCollectionMeta: objectType({
      name: RESPONSE_COLLECTION_META_TYPE_NAME,

      definition(t) {
        const { resolvePagination } = getService('builders').get('content-api');

        t.nonNull.field('pagination', {
          type: PAGINATION_TYPE_NAME,
          resolve: resolvePagination,
        });
      },
    }),
  };
};
