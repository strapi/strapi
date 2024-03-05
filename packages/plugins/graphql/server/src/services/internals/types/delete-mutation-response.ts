import { objectType } from 'nexus';
import type { Context } from '../../types';

export default ({ strapi }: Context) => {
  const { DELETE_MUTATION_RESPONSE_TYPE_NAME } = strapi.plugin('graphql').service('constants');

  return {
    /**
     * Type definition for a Pagination object
     * @type {NexusObjectTypeDef}
     */
    DeleteMutationResponse: objectType({
      name: DELETE_MUTATION_RESPONSE_TYPE_NAME,

      definition(t) {
        t.nonNull.id('documentId');
      },
    }),
  };
};
