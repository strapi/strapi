import { StrapiCTX } from '../../../types/strapi-ctx';

export default ({ strapi }: StrapiCTX, t: any) => {
  const { PUBLICATION_STATE_TYPE_NAME } = strapi.plugin('graphql').service('constants');

  return t.arg({
    type: PUBLICATION_STATE_TYPE_NAME,
    default: 'live',
  });
};
