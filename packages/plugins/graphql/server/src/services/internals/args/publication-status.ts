import { arg } from 'nexus';
import { Context } from '../../types';

export default ({ strapi }: Context) => {
  const { PUBLICATION_STATUS_TYPE_NAME } = strapi.plugin('graphql').service('constants');

  return arg({
    type: PUBLICATION_STATUS_TYPE_NAME,
    default: 'published',
  });
};
