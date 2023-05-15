'use strict';

const { WORKFLOW_MODEL_UID, ENTITY_STAGE_ATTRIBUTE } = require('../../constants/workflows');
const { getService } = require('../../utils');

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

  update(id, workflowData, opts = {}) {
    return strapi.entityService.update(WORKFLOW_MODEL_UID, id, { ...opts, data: workflowData });
  },

  async assignWorkflowToCT(id, contentTypeUID) {
    const stagesService = getService('stages', { strapi });
    const workflow = await this.findById(id, { populate: 'stages' });

    const model = strapi.db.metadata.get(contentTypeUID);

    strapi.db.metadata.hideRelation(model, ENTITY_STAGE_ATTRIBUTE, false);
    await stagesService.updateEntitiesStage(contentTypeUID, {
      fromStageId: null,
      toStageId: workflow.stages[0].id,
    });
  },
});
