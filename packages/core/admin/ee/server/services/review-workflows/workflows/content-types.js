'use strict';

const { mapAsync } = require('@strapi/utils');
const { difference, merge } = require('lodash/fp');
const { getService } = require('../../../utils');
const { WORKFLOW_MODEL_UID } = require('../../../constants/workflows');

module.exports = ({ strapi }) => {
  const contentManagerContentTypeService = strapi
    .plugin('content-manager')
    .service('content-types');
  const stagesService = getService('stages', { strapi });

  const updateContentTypeConfig = async (uid, reviewWorkflowOption) => {
    // Merge options in the configuration as the configuration service use a destructuration merge which doesn't include nested objects
    const modelConfig = await contentManagerContentTypeService.findConfiguration(uid);

    await contentManagerContentTypeService.updateConfiguration(
      { uid },
      { options: merge(modelConfig.options, { reviewWorkflows: reviewWorkflowOption }) }
    );
  };

  return {
    /**
     * Migrates entities stages. Used when a content type is assigned to a workflow.
     * @param {*} options
     * @param {Array<string>} options.srcContentTypes - The content types assigned to the previous workflow
     * @param {Array<string>} options.destContentTypes - The content types assigned to the new workflow
     * @param {Workflow.Stage} options.stageId - The new stage to assign the entities to
     */
    async migrate({ srcContentTypes = [], destContentTypes, stageId }) {
      // Workflows service is using this content-types service, to avoid an infinite loop, we need to get the service in the method
      const workflowsService = getService('workflows', { strapi });
      const { created, deleted } = diffContentTypes(srcContentTypes, destContentTypes);

      const contentTypesToTransfer = {};

      await mapAsync(created, async (uid) => {
        // If it was assigned to another workflow, transfer it from the previous workflow
        const srcWorkflow = await workflowsService.getAssignedWorkflow(uid);
        if (srcWorkflow) {
          // Updates all existing entities stages links to the new stage
          await stagesService.updateEntitiesStage(uid, { toStageId: stageId });

          // Workflows will be updated afterwards, to avoid race conditions
          if (contentTypesToTransfer[srcWorkflow.id]) {
            const workflow = contentTypesToTransfer[srcWorkflow.id];
            contentTypesToTransfer[srcWorkflow.id] = workflow.filter((ct) => ct.uid !== uid);
          } else {
            contentTypesToTransfer[srcWorkflow.id] = srcWorkflow.contentTypes.filter(
              (ct) => ct.uid !== uid
            );
          }
          return;
        }
        await updateContentTypeConfig(uid, true);

        // Create new stages links to the new stage
        return stagesService.updateEntitiesStage(uid, {
          fromStageId: null,
          toStageId: stageId,
        });
      });

      await mapAsync(Object.entries(contentTypesToTransfer), async ([workflowId, contentTypes]) =>
        this.transferContentTypes(workflowId, contentTypes)
      );

      // TODO: Manage edge cases where content type is assigned twice to other workflows
      await mapAsync(deleted, async (uid) => {
        await updateContentTypeConfig(uid, false);
        await stagesService.deleteAllEntitiesStage(uid, {});
      });
    },

    /**
     * Using the workflow content types, transfer the content types to the new workflow
     * @param {Workflow} srcWorkflow - The workflow to transfer from
     * @param {string} uid - The content type uid
     */
    async transferContentTypes(workflowId, contentTypes) {
      // Update assignedContentTypes of the previous workflow
      await strapi.entityService.update(WORKFLOW_MODEL_UID, workflowId, {
        data: {
          contentTypes,
        },
      });
    },
  };
};

const diffContentTypes = (srcContentTypes, destContentTypes) => {
  const created = difference(destContentTypes, srcContentTypes);
  const deleted = difference(srcContentTypes, destContentTypes);
  return { created, deleted };
};
