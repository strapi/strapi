'use strict';

const { arg } = require('nexus');

module.exports = ({ strapi }) => {
  const { PUBLICATION_STATE_TYPE_NAME } = strapi.plugin('graphql').service('constants');

  return arg({
    type: PUBLICATION_STATE_TYPE_NAME,
    default: 'live',
  });
};
