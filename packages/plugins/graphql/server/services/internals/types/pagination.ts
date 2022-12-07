import { StrapiCTX } from '../../../types/strapi-ctx';
import { builder } from '../../builders/pothosBuilder';

export default ({ strapi }: StrapiCTX) => {
  const { PAGINATION_TYPE_NAME } = strapi.plugin('graphql').service('constants');

  return {
    /**
     * Type definition for a Pagination object
     * @type {NexusObjectTypeDef}
     */
    Pagination: builder.objectType(PAGINATION_TYPE_NAME, {
      fields(t) {
        return {
          total: t.int({ nullable: false }),
          page: t.int({ nullable: false }),
          pageSize: t.int({ nullable: false }),
          pageCount: t.int({ nullable: false }),
        };
      },
    }),
  };
};
