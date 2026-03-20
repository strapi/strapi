import { arg } from 'nexus';
import type { Context } from '../../types';

export default ({ strapi }: Context) => {
  const { PUBLICATION_FILTER_TYPE_NAME } = strapi.plugin('graphql').service('constants');

  return arg({
    type: PUBLICATION_FILTER_TYPE_NAME,
  });
};
