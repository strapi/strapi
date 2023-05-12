'use strict';

const { set } = require('lodash/fp');
const { WORKFLOW_MODEL_UID } = require('../../constants/workflows');
const { getService } = require('../../utils');

module.exports = ({ strapi }) => ({
  find(opts) {
    return strapi.entityService.findMany(WORKFLOW_MODEL_UID, opts);
  },

  findById(id, opts) {
    return strapi.entityService.findOne(WORKFLOW_MODEL_UID, id, opts);
  },

  async create(opts) {
    let createOpts = opts;

    // Create stages if provided
    if (opts.data.stages) {
      const stageIds = await getService('stages', { strapi })
        .replaceStages([], opts.data.stages)
        .then((stages) => stages.map((stage) => stage.id));

      createOpts = set('data.stages', stageIds, opts);
    }

    return strapi.entityService.create(WORKFLOW_MODEL_UID, createOpts);
  },

  count() {
    return strapi.entityService.count(WORKFLOW_MODEL_UID);
  },

  update(id, workflowData) {
    return strapi.entityService.update(WORKFLOW_MODEL_UID, id, { data: workflowData });
  },
});
