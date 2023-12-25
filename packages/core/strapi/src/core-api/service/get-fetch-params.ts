import { contentTypes as contentTypeUtils } from '@strapi/utils';

const {
  constants: { DP_PUB_STATE_LIVE },
} = contentTypeUtils;

/**
 * Create default fetch params
 */
export const getFetchParams = (params = {}) => {
  return {
    publicationState: DP_PUB_STATE_LIVE,
    ...params,
  };
};
