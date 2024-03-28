import { arg } from 'nexus';
import type { Context } from '../../types';

export default ({ strapi }: Context) => {
  const { PUBLICATION_STATE_TYPE_NAME } = strapi.plugin('graphql').service('constants');

  return arg({
    type: PUBLICATION_STATE_TYPE_NAME,
    default: 'live',
  });
};
