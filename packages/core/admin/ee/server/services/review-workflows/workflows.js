'use strict';

const { set } = require('lodash/fp');
const { ApplicationError, ValidationError } = require('@strapi/utils').errors;
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
    if (!opts.data.stages || opts.data.stages.length === 0) {
      throw new ValidationError('Can not create a workflow without stages');
    }

    return strapi.db.transaction(async () => {
      // Create stages
      const stageIds = await getService('stages', { strapi })
        .replaceStages([], opts.data.stages)
        .then((stages) => stages.map((stage) => stage.id));

      const createOpts = set('data.stages', stageIds, opts);

      // Update (un)assigned Content Types
      if (opts.data.assignedContentTypes) {
        await getService('assigned-content-types').create({
          assigned: opts.data.assignedContentTypes,
          defaultStage: { id: stageIds[0] },
        });
      }

      // Create Workflow
      return strapi.entityService.create(WORKFLOW_MODEL_UID, createOpts);
    });
  },

  async update(workflow, opts) {
    const stageService = getService('stages', { strapi });
    let updateOpts = { ...opts, populate: { stages: true } };
    let updatedStageIds = [];

    return strapi.db.transaction(async () => {
      // Update stages
      if (opts.data.stages) {
        opts.data.stages.forEach((stage) => this.assertStageBelongsToWorkflow(stage.id, workflow));

        updatedStageIds = await stageService
          .replaceStages(workflow.stages, opts.data.stages, workflow.assignedContentTypes)
          .then((stages) => stages.map((stage) => stage.id));

        updateOpts = set('data.stages', updatedStageIds, opts);
      }

      // Update (un)assigned Content Types
      if (opts.data.assignedContentTypes) {
        await getService('assigned-content-types').update({
          srcAssigned: workflow.assignedContentTypes,
          destAssigned: opts.data.assignedContentTypes,
          defaultStage: updatedStageIds.length ? { id: updatedStageIds[0] } : workflow.stages[0],
        });
      }

      // Update Workflow
      return strapi.entityService.update(WORKFLOW_MODEL_UID, workflow.id, updateOpts);
    });
  },

  count() {
    return strapi.entityService.count(WORKFLOW_MODEL_UID);
  },

  async assertContentTypeBelongsToWorkflow(uid) {
    const workflow = await getService('assigned-content-types').getAssignedWorkflow(uid, {
      populate: 'stages',
    });
    if (!workflow) {
      throw new ApplicationError(`Review workflows is not activated on Content Type ${uid}.`);
    }
    return workflow;
  },

  assertStageBelongsToWorkflow(stageId, workflow) {
    if (!stageId) {
      return;
    }

    const belongs = workflow.stages.some((stage) => stage.id === stageId);
    if (!belongs) {
      throw new ApplicationError(`Stage ${stageId} does not belong to workflow ${workflow.id}`);
    }
  },
});
