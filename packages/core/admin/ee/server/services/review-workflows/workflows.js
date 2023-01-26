'use strict';

const { WORKFLOW_MODEL_UID } = require('../../constants/workflows');

module.exports = ({ strapi }) => ({
  find({ populate }) {
    const params = { populate };
    return strapi.entityService.findMany(WORKFLOW_MODEL_UID, params);
  },

  findOne(id, { populate }) {
    const params = { populate };
    return strapi.entityService.findOne(WORKFLOW_MODEL_UID, id, params);
  },
});
