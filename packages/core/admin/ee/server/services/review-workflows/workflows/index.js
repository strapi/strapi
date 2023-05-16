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
    /**
     * Returns all the workflows matching the user-defined filters.
     * @param {object} opts - Options for the query.
     * @param {object} opts.filters - Filters object.
     * @returns {Promise<object[]>} - List of workflows that match the user's filters.
     */
    async find(opts) {
      const filters = processFilters({ strapi }, opts.filters);
      return strapi.entityService.findMany(WORKFLOW_MODEL_UID, { ...opts, filters });
    },

    /**
     * Returns the workflow with the specified ID.
     * @param {string} id - ID of the requested workflow.
     * @param {object} opts - Options for the query.
     * @returns {Promise<object>} - Workflow object matching the requested ID.
     */
    findById(id, opts) {
      return strapi.entityService.findOne(WORKFLOW_MODEL_UID, id, opts);
    },

    /**
     * Creates a new workflow.
     * @param {object} opts - Options for creating the new workflow.
     * @returns {Promise<object>} - Workflow object that was just created.
     * @throws {ValidationError} - If the workflow has no stages.
     */
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

        // Update (un)assigned Content Types
        if (opts.data.contentTypes) {
          await workflowsContentTypes.migrate({
            destContentTypes: opts.data.contentTypes,
            stageId: stageIds[0],
          });
        }

        // Create Workflow
        return strapi.entityService.create(WORKFLOW_MODEL_UID, createOpts);
      });
    },

    /**
     * Updates an existing workflow.
     * @param {object} workflow - The existing workflow to update.
     * @param {object} opts - Options for updating the workflow.
     * @returns {Promise<object>} - Workflow object that was just updated.
     * @throws {ApplicationError} - If the supplied stage ID does not belong to the workflow.
     */
    async update(workflow, opts) {
      const stageService = getService('stages', { strapi });
      let updateOpts = { ...opts, populate: { stages: true } };
      let updatedStageIds;

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

        // Update (un)assigned Content Types
        if (opts.data.contentTypes) {
          await workflowsContentTypes.migrate({
            srcContentTypes: workflow.contentTypes,
            destContentTypes: opts.data.contentTypes,
            stageId: updatedStageIds ? updatedStageIds[0] : workflow.stages[0].id,
          });
        }

        // Update Workflow
        return strapi.entityService.update(WORKFLOW_MODEL_UID, workflow.id, updateOpts);
      });
    },

    /**
     * Returns the total count of workflows.
     * @returns {Promise<number>} - Total count of workflows.
     */
    count() {
      return strapi.entityService.count(WORKFLOW_MODEL_UID);
    },

    /**
     * Finds the assigned workflow for a given content type ID.
     * @param {string} uid - Content type ID to find the assigned workflow for.
     * @param {object} opts - Options for the query.
     * @returns {Promise<object|null>} - Assigned workflow object if found, or null.
     */
    async getAssignedWorkflow(uid, opts = {}) {
      const workflows = await getService('workflows').find({
        ...opts,
        filters: { contentTypes: getContentTypeFilter({ strapi }, uid) },
      });
      return workflows.length > 0 ? workflows[0] : null;
    },

    /**
     * Asserts that a content type has an assigned workflow.
     * @param {string} uid - Content type ID to verify the assignment of.
     * @returns {Promise<object>} - Workflow object associated with the content type ID.
     * @throws {ApplicationError} - If no assigned workflow is found for the content type ID.
     */
    async assertContentTypeBelongsToWorkflow(uid) {
      const workflow = await this.getAssignedWorkflow(uid, {
        populate: 'stages',
      });
      if (!workflow) {
        throw new ApplicationError(`Review workflows is not activated on Content Type ${uid}.`);
      }
      return workflow;
    },

    /**
     * Asserts that a stage belongs to a given workflow.
     * @param {string} stageId - ID of stage to check.
     * @param {object} workflow - Workflow object to check against.
     * @returns
     * @throws {ApplicationError} - If the stage does not belong to the specified workflow.
     */
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
