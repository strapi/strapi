'use strict';

const { WORKFLOW_MODEL_UID } = require('../constants/workflows');

module.exports = ({ strapi }) => ({
  find(opts) {
    const params = { ...opts };
    return strapi.entityService.findMany(WORKFLOW_MODEL_UID, params);
  },

  findOne(id) {
    const params = {};
    return strapi.entityService.findOne(WORKFLOW_MODEL_UID, id, params);
  },
});
