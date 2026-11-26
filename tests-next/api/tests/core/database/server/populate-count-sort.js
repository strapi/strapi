'use strict';

module.exports = {
  actions: {
    entityServiceLoad({ strapi }, { uid, entity, field, params }) {
      return strapi.entityService.load(uid, entity, field, params);
    },
  },
};
