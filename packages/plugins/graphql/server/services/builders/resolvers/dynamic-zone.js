'use strict';

module.exports = ({ strapi }) => ({
  buildDynamicZoneResolver: ({ contentTypeUID, attributeName }) => async parent => {
    return strapi.db.entityManager.load(contentTypeUID, parent, attributeName);
  },
});
