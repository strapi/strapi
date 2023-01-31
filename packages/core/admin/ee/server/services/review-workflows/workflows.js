'use strict';

const { WORKFLOW_MODEL_UID } = require('../../constants/workflows');

module.exports = ({ strapi }) => ({
  find(opts) {
    return strapi.entityService.findMany(WORKFLOW_MODEL_UID, opts);
  },

  findById(id) {
    return strapi.entityService.findOne(WORKFLOW_MODEL_UID, id, {});
  },
});
