import { arg } from 'nexus';
import { StrapiContext } from '../../types';

export default ({ strapi }: StrapiContext) => {
  const { PUBLICATION_STATUS_TYPE_NAME } = strapi.plugin('graphql').service('constants');

  return arg({
    type: PUBLICATION_STATUS_TYPE_NAME,
    default: 'published',
  });
};
