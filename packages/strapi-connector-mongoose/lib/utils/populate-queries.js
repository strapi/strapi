'use strict';

const {
  contentTypes: {
    constants: { PUBLISHED_AT_ATTRIBUTE, DP_PUB_STATE_LIVE, DP_PUB_STATE_PREVIEW },
  },
} = require('strapi-utils');

module.exports = {
  publicationState: {
    [DP_PUB_STATE_LIVE]: { [PUBLISHED_AT_ATTRIBUTE]: { $ne: null, $exists: true } },
    [DP_PUB_STATE_PREVIEW]: undefined,
  },
};
