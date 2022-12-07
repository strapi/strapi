'use strict';

module.exports = ({ strapi }, t) => {
  const { PUBLICATION_STATE_TYPE_NAME } = strapi.plugin('graphql').service('constants');

  return t.arg({
    type: PUBLICATION_STATE_TYPE_NAME,
    default: 'live',
  });
};
