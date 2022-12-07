import { StrapiCTX } from '../../../types/strapi-ctx';
import { builder } from '../../builders/pothosBuilder';

export default ({ strapi }: StrapiCTX) => {
  const { PUBLICATION_STATE_TYPE_NAME } = strapi.plugin('graphql').service('constants');

  return {
    /**
     * An enum type definition representing a publication state
     */
    PublicationState: builder.enumType(PUBLICATION_STATE_TYPE_NAME, {
      values: {
        // Published only
        LIVE: { value: 'live' },
        // Published & draft
        PREVIEW: { value: 'preview' },
      },
    }),
  };
};
