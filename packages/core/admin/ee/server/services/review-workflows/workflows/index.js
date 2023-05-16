'use strict';

const { set, isString } = require('lodash/fp');
const { ApplicationError, ValidationError } = require('@strapi/utils').errors;
const { WORKFLOW_MODEL_UID } = require('../../../constants/workflows');
const { getService } = require('../../../utils');
const workflowsContentTypesFactory = require('./content-types');

const getContentTypeFilter = ({ strapi }, contentType) => {
  if (strapi.db.dialect.supportsOperator('$jsonSupersetOf')) {
    return { $jsonSupersetOf: JSON.stringify([contentType]) };
  }
  return { $contains: `"${contentType}"` };
};

const processFilters = ({ strapi }, filters = {}) => {
  const processedFilters = { ...filters };

  if (isString(filters.contentTypes)) {
    processedFilters.contentTypes = getContentTypeFilter({ strapi }, filters.contentTypes);
  }

  return processedFilters;
};

module.exports = ({ strapi }) => {
  const workflowsContentTypes = workflowsContentTypesFactory({ strapi });

  return {
    async find(opts) {
      const filters = processFilters({ strapi }, opts.filters);
      return strapi.entityService.findMany(WORKFLOW_MODEL_UID, { ...opts, filters });
    },

    findById(id, opts) {
      return strapi.entityService.findOne(WORKFLOW_MODEL_UID, id, opts);
    },

    async create(opts) {
      let createOpts = { ...opts, populate: { stages: true } };

      if (!opts.data.stages || opts.data.stages.length === 0) {
        throw new ValidationError('Can not create a workflow without stages');
      }

      return strapi.db.transaction(async () => {
        // Create stages
        const stageIds = await getService('stages', { strapi })
          .replaceStages([], opts.data.stages)
          .then((stages) => stages.map((stage) => stage.id));

        createOpts = set('data.stages', stageIds, createOpts);

        // Create Workflow
        const workflow = await strapi.entityService.create(WORKFLOW_MODEL_UID, createOpts);

        // Update (un)assigned Content Types
        if (opts.data.contentTypes) {
          await workflowsContentTypes.migrate({
            destContentTypes: opts.data.contentTypes,
            destWorkflow: workflow,
          });
        }

        return workflow;
      });
    },

    async update(workflow, opts) {
      const stageService = getService('stages', { strapi });
      let updateOpts = { ...opts, populate: { stages: true } };
      let updatedStageIds = [];

      return strapi.db.transaction(async () => {
        // Update stages
        if (opts.data.stages) {
          opts.data.stages.forEach((stage) =>
            this.assertStageBelongsToWorkflow(stage.id, workflow)
          );

          updatedStageIds = await stageService
            .replaceStages(workflow.stages, opts.data.stages, workflow.contentTypes)
            .then((stages) => stages.map((stage) => stage.id));

          updateOpts = set('data.stages', updatedStageIds, opts);
        }

        // Update Workflow
        const updatedWorkflow = await strapi.entityService.update(
          WORKFLOW_MODEL_UID,
          workflow.id,
          updateOpts
        );

        // Update (un)assigned Content Types
        if (opts.data.contentTypes) {
          await workflowsContentTypes.migrate({
            srcContentTypes: workflow.contentTypes,
            destContentTypes: opts.data.contentTypes,
            destWorkflow: updatedWorkflow,
          });
        }

        return updatedWorkflow;
      });
    },

    count() {
      return strapi.entityService.count(WORKFLOW_MODEL_UID);
    },

    async getAssignedWorkflow(uid, opts) {
      const workflows = await getService('workflows').find({
        ...opts,
        filters: { contentTypes: getContentTypeFilter({ strapi }, uid) },
      });
      return workflows.length > 0 ? workflows[0] : null;
    },

    async assertContentTypeBelongsToWorkflow(uid) {
      const workflow = await this.getAssignedWorkflow(uid, {
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
        throw new ApplicationError(`Stage does not belong to workflow "${workflow.name}"`);
      }
    },
  };
};
