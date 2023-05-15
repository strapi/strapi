'use strict';

const { mapAsync } = require('@strapi/utils');
const { difference } = require('lodash/fp');
const { getService } = require('../../utils');
const { WORKFLOW_MODEL_UID } = require('../../constants/workflows');

module.exports = () => ({
  async create({ assigned, defaultStage }) {
    await mapAsync(assigned, async (uid) => {
      const swappingFromWorkflow = await this.getAssignedWorkflow(uid);
      // Content type is already assigned to a workflow, swap it
      if (swappingFromWorkflow) {
        return this.swapAssignedContentType(swappingFromWorkflow, defaultStage, uid);
      }
      // Content type is not assigned to a workflow, init it
      return this.initEntityStages(uid, defaultStage);
    });
  },

  async update({ srcAssigned, destAssigned, defaultStage }) {
    // Find difference between old assignedContentTypes and new ones, using lodash fp
    const { created, deleted } = diffAssignedContentTypes(srcAssigned, destAssigned);

    await mapAsync(created, async (uid) => {
      const swappingFromWorkflow = await this.getAssignedWorkflow(uid);
      // Content type is already assigned to a workflow, swap it
      if (swappingFromWorkflow) {
        return this.swapAssignedContentType(swappingFromWorkflow, defaultStage, uid);
      }
      // Content type is not assigned to a workflow, init it
      return this.initEntityStages(uid, defaultStage);
    });

    await mapAsync(deleted, async (uid) => {
      await getService('stages').deleteAllEntitiesStage(uid, {});
    });
  },

  /**
   * Swapping involves:
   *  - Updating entity stages of the content type
   *  - Updating the assignedContentTypes of the previous workflow
   * @param {Workflow} srcWorkflow
   * @param {Workflow.Stage} stage
   * @param {string} uid
   */
  async swapAssignedContentType(srcWorkflow, stage, uid) {
    // Update entity stages of the content type
    await getService('stages').updateAllEntitiesStage(uid, { toStageId: stage.id });
    // Update assignedContentTypes of the previous workflow
    await strapi.entityService.update(WORKFLOW_MODEL_UID, srcWorkflow.id, {
      data: {
        assignedContentTypes: srcWorkflow.assignedContentTypes.filter((ct) => ct !== uid),
      },
    });
  },

  async initEntityStages(uid, stage) {
    return getService('stages').updateEntitiesStage(uid, {
      fromStageId: null,
      toStageId: stage.id,
    });
  },

  // TODO: Change name to getWorkflow(?) / getWorkflowByAssignedContentType() /
  async getAssignedWorkflow(uid, opts) {
    // TODO: Improve filter
    const workflows = await getService('workflows').find({
      ...opts,
      filters: { assignedContentTypes: { $contains: [uid] } },
    });
    return workflows.length > 0 ? workflows[0] : null;
  },
});

const diffAssignedContentTypes = (srcContentTypes, destContentTypes) => {
  const created = difference(destContentTypes, srcContentTypes);
  const deleted = difference(srcContentTypes, destContentTypes);
  return { created, deleted };
};
