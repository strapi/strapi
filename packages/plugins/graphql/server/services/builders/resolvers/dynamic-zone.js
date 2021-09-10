'use strict';

module.exports = ({ strapi }) => ({
  buildDynamicZoneResolver: ({ contentTypeUID, attributeName }) => async parent => {
    return strapi.entityService.load(contentTypeUID, parent, attributeName);
  },
});
