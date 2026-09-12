import { objectType } from 'nexus';
import type { StrapiContext } from '../../types';

export default ({ strapi }: StrapiContext) => {
  const { DELETE_MUTATION_RESPONSE_TYPE_NAME } = strapi.plugin('graphql').service('constants');

  return {
    DeleteMutationResponse: objectType({
      name: DELETE_MUTATION_RESPONSE_TYPE_NAME,

      definition(t) {
        t.nonNull.id('documentId');
      },
    }),
  };
};
