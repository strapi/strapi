'use strict';

const { STAGE_MODEL_UID } = require('../../constants/workflows');

module.exports = ({ strapi }) => ({
  find({ workflowId, populate }) {
    const params = {
      filters: { workflow: workflowId },
      populate,
    };
    return strapi.entityService.findMany(STAGE_MODEL_UID, params);
  },

  findById(id, { workflowId, populate }) {
    const params = {
      filters: { workflow: workflowId },
      populate,
    };
    return strapi.entityService.findOne(STAGE_MODEL_UID, id, params);
  },

  createMany(stagesList, { fields }) {
    const params = {
      select: fields,
    };
    return Promise.all(
      stagesList.map((stage) =>
        strapi.entityService.create(STAGE_MODEL_UID, { data: stage, ...params })
      )
    );
  },

  count() {
    return strapi.entityService.count(STAGE_MODEL_UID);
  },
});
