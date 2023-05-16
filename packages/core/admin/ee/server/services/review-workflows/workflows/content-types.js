'use strict';

const { mapAsync } = require('@strapi/utils');
const { difference } = require('lodash/fp');
const { getService } = require('../../../utils');
const { WORKFLOW_MODEL_UID } = require('../../../constants/workflows');

module.exports = ({ strapi }) => ({
  /**
   * Migrate content types entities assigned to a workflow
   * @param {*} options
   * @param {Array<string>} options.srcContentTypes - The content types assigned to the previous workflow
   * @param {Array<string>} options.destContentTypes - The content types assigned to the new workflow
   * @param {Workflow} options.destWorkflow - The new workflow
   */
  async migrate({ srcContentTypes = [], destContentTypes, destWorkflow }) {
    const { created, deleted } = diffContentTypes(srcContentTypes, destContentTypes);

    await mapAsync(created, async (uid) => {
      // If it was assigned to another workflow, transfer it from the previous workflow
      const srcWorkflow = await getService('workflows').getAssignedWorkflow(uid);
      if (srcWorkflow) {
        await this.transferContentType(srcWorkflow, destWorkflow, uid);
      }

      const newStage = destWorkflow.stages[0];
      return getService('stages').updateAllEntitiesStage(uid, { toStageId: newStage.id });
    });

    await mapAsync(deleted, async (uid) => {
      await getService('stages').deleteAllEntitiesStage(uid, {});
    });
  },

  /**
   * @param {Workflow} srcWorkflow - The workflow to transfer from
   * @param {Workflow} destWorkflow - The workflow to transfer to
   * @param {string} uid - The content type uid
   */
  async transferContentType(srcWorkflow, destWorkflow, uid) {
    // Update assignedContentTypes of the previous workflow
    await strapi.entityService.update(WORKFLOW_MODEL_UID, srcWorkflow.id, {
      data: {
        contentTypes: srcWorkflow.contentTypes.filter((ct) => ct !== uid),
      },
    });
  },
});

const diffContentTypes = (srcContentTypes, destContentTypes) => {
  const created = difference(destContentTypes, srcContentTypes);
  const deleted = difference(srcContentTypes, destContentTypes);
  return { created, deleted };
};
