import type { Core } from '@strapi/types';
import { set, isString, map, get } from 'lodash/fp';
import { errors } from '@strapi/utils';
import { WORKFLOW_MODEL_UID, WORKFLOW_POPULATE } from '../constants/workflows';
import { getService } from '../utils';
import { getWorkflowContentTypeFilter } from '../utils/review-workflows';
import workflowsContentTypesFactory from './workflow-content-types';

const processFilters = ({ strapi }: { strapi: Core.Strapi }, filters: any = {}) => {
  const processedFilters = { ...filters };

  if (isString(filters.contentTypes)) {
    processedFilters.contentTypes = getWorkflowContentTypeFilter({ strapi }, filters.contentTypes);
  }

  return processedFilters;
};

// TODO: How can we improve this? Maybe using traversePopulate?
const processPopulate = (populate: any) => {
  // If it does not exist or it's not an object (like an array) return the default populate
  if (!populate) {
    return populate;
  }

  return WORKFLOW_POPULATE;
};

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const workflowsContentTypes = workflowsContentTypesFactory({ strapi });
  const workflowValidator = getService('validation', { strapi });
  const metrics = getService('workflow-metrics', { strapi });

  return {
    /**
     * Returns all the workflows matching the user-defined filters.
     * @param {object} opts - Options for the query.
     * @param {object} opts.filters - Filters object.
     * @returns {Promise<object[]>} - List of workflows that match the user's filters.
     */
    async find(opts: any = {}) {
      const filters = processFilters({ strapi }, opts.filters);
      const populate = processPopulate(opts.populate);

      const query = strapi.get('query-params').transform(WORKFLOW_MODEL_UID, {
        ...opts,
        filters,
        populate,
      });

      return strapi.db.query(WORKFLOW_MODEL_UID).findMany(query);
    },

    /**
     * Returns the workflow with the specified ID.
     * @param {string} id - ID of the requested workflow.
     * @param {object} opts - Options for the query.
     * @returns {Promise<object>} - Workflow object matching the requested ID.
     */
    findById(id: any, opts: { populate?: any } = {}) {
      const populate = processPopulate(opts.populate);

      const query = strapi.get('query-params').transform(WORKFLOW_MODEL_UID, { populate });

      return strapi.db.query(WORKFLOW_MODEL_UID).findOne({
        ...query,
        where: { id },
      });
    },

    /**
     * Creates a new workflow.
     * @param {object} opts - Options for creating the new workflow.
     * @returns {Promise<object>} - Workflow object that was just created.
     * @throws {ValidationError} - If the workflow has no stages.
     */
    async create(opts: { data: any }) {
      let createOpts = { ...opts, populate: WORKFLOW_POPULATE };

      workflowValidator.validateWorkflowStages(opts.data.stages);
      await workflowValidator.validateWorkflowCount(1);

      return strapi.db.transaction(async () => {
        // Create stages
        const stages = await getService('stages', { strapi }).createMany(opts.data.stages);
        const mapIds = map(get('id'));

        createOpts = set('data.stages', mapIds(stages), createOpts);

        // Update (un)assigned Content Types
        if (opts.data.contentTypes) {
          await workflowsContentTypes.migrate({
            destContentTypes: opts.data.contentTypes,
            stageId: stages[0].id,
          });
        }

        metrics.sendDidCreateWorkflow();

        // Create Workflow
        return strapi.db
          .query(WORKFLOW_MODEL_UID)
          .create(strapi.get('query-params').transform(WORKFLOW_MODEL_UID, createOpts));
      });
    },

    /**
     * Updates an existing workflow.
     * @param {object} workflow - The existing workflow to update.
     * @param {object} opts - Options for updating the workflow.
     * @returns {Promise<object>} - Workflow object that was just updated.
     * @throws {ApplicationError} - If the supplied stage ID does not belong to the workflow.
     */
    async update(workflow: any, opts: any) {
      const stageService = getService('stages', { strapi });
      let updateOpts = { ...opts, populate: { ...WORKFLOW_POPULATE } };
      let updatedStageIds: any;

      await workflowValidator.validateWorkflowCount();

      return strapi.db.transaction(async () => {
        // Update stages
        if (opts.data.stages) {
          workflowValidator.validateWorkflowStages(opts.data.stages);
          opts.data.stages.forEach((stage: any) =>
            this.assertStageBelongsToWorkflow(stage.id, workflow)
          );

          updatedStageIds = await stageService
            .replaceStages(workflow.stages, opts.data.stages, workflow.contentTypes)
            .then((stages: any) => stages.map((stage: any) => stage.id));

          updateOpts = set('data.stages', updatedStageIds, updateOpts);
        }

        // Update (un)assigned Content Types
        if (opts.data.contentTypes) {
          await workflowsContentTypes.migrate({
            srcContentTypes: workflow.contentTypes,
            destContentTypes: opts.data.contentTypes,
            stageId: updatedStageIds ? updatedStageIds[0] : workflow.stages[0].id,
          });
        }

        metrics.sendDidEditWorkflow();

        const query = strapi.get('query-params').transform(WORKFLOW_MODEL_UID, updateOpts);

        // Update Workflow
        return strapi.db.query(WORKFLOW_MODEL_UID).update({
          ...query,
          where: { id: workflow.id },
        });
      });
    },

    /**
     * Deletes an existing workflow.
     * Also deletes all the workflow stages and migrate all assigned the content types.
     * @param {*} workflow
     * @param {*} opts
     * @returns
     */
    async delete(workflow: any, opts: any) {
      const stageService = getService('stages', { strapi });

      const workflowCount = await this.count();

      if (workflowCount <= 1) {
        throw new errors.ApplicationError('Can not delete the last workflow');
      }

      return strapi.db.transaction(async () => {
        // Delete stages
        await stageService.deleteMany(workflow.stages);

        // Unassign all content types, this will migrate the content types to null
        await workflowsContentTypes.migrate({
          srcContentTypes: workflow.contentTypes,
          destContentTypes: [],
        });

        const query = strapi.get('query-params').transform(WORKFLOW_MODEL_UID, opts);
        // Delete Workflow
        return strapi.db.query(WORKFLOW_MODEL_UID).delete({
          ...query,
          where: { id: workflow.id },
        });
      });
    },
    /**
     * Returns the total count of workflows.
     * @returns {Promise<number>} - Total count of workflows.
     */
    count() {
      return strapi.db.query(WORKFLOW_MODEL_UID).count();
    },

    /**
     * Finds the assigned workflow for a given content type ID.
     * @param {string} uid - Content type ID to find the assigned workflow for.
     * @param {object} opts - Options for the query.
     * @returns {Promise<object|null>} - Assigned workflow object if found, or null.
     */
    async getAssignedWorkflow(uid: any, opts: any = {}) {
      const workflows = await this._getAssignedWorkflows(uid, opts);

      return workflows.length > 0 ? workflows[0] : null;
    },

    /**
     * Finds all the assigned workflows for a given content type ID.
     * Normally, there should only be one workflow assigned to a content type.
     * However, edge cases can occur where a content type is assigned to multiple workflows.
     * @param {string} uid - Content type ID to find the assigned workflows for.
     * @param {object} opts - Options for the query.
     * @returns {Promise<object[]>} - List of assigned workflow objects.
     */
    async _getAssignedWorkflows(uid: any, opts = {}) {
      return this.find({
        ...opts,
        filters: { contentTypes: getWorkflowContentTypeFilter({ strapi }, uid) },
      });
    },

    /**
     * Asserts that a content type has an assigned workflow.
     * @param {string} uid - Content type ID to verify the assignment of.
     * @returns {Promise<object>} - Workflow object associated with the content type ID.
     * @throws {ApplicationError} - If no assigned workflow is found for the content type ID.
     */
    async assertContentTypeBelongsToWorkflow(uid: any) {
      const workflow = await this.getAssignedWorkflow(uid, {
        populate: 'stages',
      });

      if (!workflow) {
        throw new errors.ApplicationError(
          `Review workflows is not activated on Content Type ${uid}.`
        );
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
    assertStageBelongsToWorkflow(stageId: any, workflow: any) {
      if (!stageId) {
        return;
      }

      const belongs = workflow.stages.some((stage: any) => stage.id === stageId);
      if (!belongs) {
        throw new errors.ApplicationError(`Stage does not belong to workflow "${workflow.name}"`);
      }
    },
  };
};
