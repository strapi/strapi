'use strict';

module.exports = ({ strapi }) => ({
  buildDynamicZoneResolver({ contentTypeUID, attributeName }) {
    return async (parent) => {
      return strapi.entityService.load(contentTypeUID, parent, attributeName);
    };
  },
});
