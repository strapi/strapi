'use strict';

const { mapAsync } = require('@strapi/utils');
const { difference } = require('lodash/fp');
const { getService } = require('../../../utils');
const { WORKFLOW_MODEL_UID } = require('../../../constants/workflows');

module.exports = ({ strapi }) => {
  const contentManagerContentTypeService = strapi
    .plugin('content-manager')
    .service('content-types');

  return {
    /**
     * Migrates entities stages. Used when a content type is assigned to a workflow.
     * @param {*} options
     * @param {Array<string>} options.srcContentTypes - The content types assigned to the previous workflow
     * @param {Array<string>} options.destContentTypes - The content types assigned to the new workflow
     * @param {Workflow.Stage} options.stageId - The new stage to assign the entities to
     */
    async migrate({ srcContentTypes = [], destContentTypes, stageId }) {
      const { created, deleted } = diffContentTypes(srcContentTypes, destContentTypes);

      await mapAsync(created, async (uid) => {
        // If it was assigned to another workflow, transfer it from the previous workflow
        const srcWorkflow = await getService('workflows').getAssignedWorkflow(uid);
        if (srcWorkflow) {
          // Updates all existing entities stages links to the new stage
          await getService('stages').updateEntitiesStage(uid, { toStageId: stageId });
          return this.transferContentType(srcWorkflow, uid);
        }

        await contentManagerContentTypeService.updateConfiguration(
          { uid },
          { options: { reviewWorkflows: true } }
        );

        // Create new stages links to the new stage
        return getService('stages').updateEntitiesStage(uid, {
          fromStageId: null,
          toStageId: stageId,
        });
      });

      await mapAsync(deleted, async (uid) => {
        await contentManagerContentTypeService.updateConfiguration(
          { uid },
          { options: { reviewWorkflows: false } }
        );
        await getService('stages').deleteAllEntitiesStage(uid, {});
      });
    },

    /**
     * Filters the content types assigned to the previous workflow.
     * @param {Workflow} srcWorkflow - The workflow to transfer from
     * @param {string} uid - The content type uid
     */
    async transferContentType(srcWorkflow, uid) {
      // Update assignedContentTypes of the previous workflow
      await strapi.entityService.update(WORKFLOW_MODEL_UID, srcWorkflow.id, {
        data: {
          contentTypes: srcWorkflow.contentTypes.filter((ct) => ct !== uid),
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
