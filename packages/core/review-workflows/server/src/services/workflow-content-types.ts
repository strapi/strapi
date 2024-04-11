import type { Core } from '@strapi/types';
import { async } from '@strapi/utils';
import { difference, merge } from 'lodash/fp';
import { getService } from '../utils';
import { WORKFLOW_MODEL_UID } from '../constants/workflows';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const contentManagerContentTypeService = strapi
    .plugin('content-manager')
    .service('content-types');
  const stagesService = getService('stages', { strapi });

  const updateContentTypeConfig = async (uid: any, reviewWorkflowOption: any) => {
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
    async migrate({ srcContentTypes = [], destContentTypes, stageId }: any) {
      const workflowsService = getService('workflows', { strapi });
      const { created, deleted } = diffContentTypes(srcContentTypes, destContentTypes);

      await async.map(
        created,
        async (uid: any) => {
          // Content Types should only be assigned to one workflow
          // However, edge cases can happen, and this handles them
          const srcWorkflows = await workflowsService._getAssignedWorkflows(uid, {});

          if (srcWorkflows.length) {
            // Updates all existing entities stages links to the new stage
            await stagesService.updateEntitiesStage(uid, { toStageId: stageId });
            // Transfer content types from the previous workflow(s)
            await async.map(srcWorkflows, (srcWorkflow: any) =>
              this.transferContentTypes(srcWorkflow, uid)
            );
          }
          await updateContentTypeConfig(uid, true);

          // Create new stages links to the new stage
          return stagesService.updateEntitiesStage(uid, {
            fromStageId: null,
            toStageId: stageId,
          });
        },
        // transferContentTypes can cause race conditions if called in parallel when updating the same workflow
        { concurrency: 1 }
      );

      await async.map(deleted, async (uid: any) => {
        await updateContentTypeConfig(uid, false);
        await stagesService.deleteAllEntitiesStage(uid, {});
      });
    },

    /**
     * Filters the content types assigned to a workflow
     * @param {Workflow} srcWorkflow - The workflow to transfer from
     * @param {string} uid - The content type uid
     */
    async transferContentTypes(srcWorkflow: any, uid: any) {
      // Update assignedContentTypes of the previous workflow
      await strapi.db.query(WORKFLOW_MODEL_UID).update({
        where: {
          id: srcWorkflow.id,
        },
        data: {
          contentTypes: srcWorkflow.contentTypes.filter((contentType: any) => contentType !== uid),
        },
      });
    },
  };
};

const diffContentTypes = (srcContentTypes: any, destContentTypes: any) => {
  const created = difference(destContentTypes, srcContentTypes);
  const deleted = difference(srcContentTypes, destContentTypes);
  return { created, deleted };
};
