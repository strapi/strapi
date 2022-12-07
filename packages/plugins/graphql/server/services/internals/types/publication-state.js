'use strict';

const { builder } = require('../../builders/pothosBuilder');

module.exports = ({ strapi }) => {
  const { PUBLICATION_STATE_TYPE_NAME } = strapi.plugin('graphql').service('constants');

  return {
    /**
     * An enum type definition representing a publication state
     * @type {NexusEnumTypeDef}
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
