'use strict';

const { set } = require('lodash/fp');
const { ValidationError } = require('@strapi/utils').errors;
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
    if (!opts.data.stages) {
      throw new ValidationError('Can not create a workflow without stages');
    }

    const stageIds = await getService('stages', { strapi })
      .replaceStages([], opts.data.stages)
      .then((stages) => stages.map((stage) => stage.id));

    const createOpts = set('data.stages', stageIds, opts);

    return strapi.entityService.create(WORKFLOW_MODEL_UID, createOpts);
  },

  count() {
    return strapi.entityService.count(WORKFLOW_MODEL_UID);
  },

  async update(workflow, opts) {
    let updateOpts = opts;

    if (opts.data.stages) {
      const stageIds = await getService('stages', { strapi })
        .replaceStages(workflow.stages, opts.data.stages)
        .then((stages) => stages.map((stage) => stage.id));

      updateOpts = set('data.stages', stageIds, opts);
    }

    return strapi.entityService.update(WORKFLOW_MODEL_UID, workflow.id, updateOpts);
  },
});
