'use strict';

const { WORKFLOW_MODEL_UID } = require('../../constants/workflows');

module.exports = ({ strapi }) => ({
  find(opts) {
    return strapi.entityService.findMany(WORKFLOW_MODEL_UID, opts);
  },

  findById(id, opts) {
    return strapi.entityService.findOne(WORKFLOW_MODEL_UID, id, opts);
  },

  create(workflowData) {
    return strapi.entityService.create(WORKFLOW_MODEL_UID, { data: workflowData });
  },

  count() {
    return strapi.entityService.count(WORKFLOW_MODEL_UID);
  },

  update(id, workflowData) {
    return strapi.entityService.update(WORKFLOW_MODEL_UID, id, { data: workflowData });
  },
});
