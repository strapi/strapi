'use strict';

const { mapAsync } = require('@strapi/utils');
const { difference } = require('lodash/fp');
const { getService } = require('../../../utils');
const { WORKFLOW_MODEL_UID } = require('../../../constants/workflows');

module.exports = ({ strapi }) => ({
  async migrate({ srcContentTypes = [], destContentTypes, destWorkflow }) {
    const { created, deleted } = diffContentTypes(srcContentTypes, destContentTypes);

    await mapAsync(created, async (uid) => {
      const srcWorkflow = await getService('workflows').getAssignedWorkflow(uid);
      if (srcWorkflow) {
        return this.transferContentType(srcWorkflow, destWorkflow, uid);
      }
      return this.migrateEntities(destWorkflow, uid);
    });

    await mapAsync(deleted, async (uid) => {
      await getService('stages').deleteAllEntitiesStage(uid, {});
    });
  },

  /**
   * Transferring involves:
   *  - Updating entity stages of the content type
   *  - Updating the contentTypes of the previous workflow
   * @param {Workflow} srcWorkflow
   * @param {Workflow} destWorkflow
   * @param {string} uid
   */
  async transferContentType(srcWorkflow, destWorkflow, uid) {
    // Update entity stages of the content type
    const newStage = destWorkflow.stages[0];
    await getService('stages').updateAllEntitiesStage(uid, { toStageId: newStage.id });

    // Update assignedContentTypes of the previous workflow
    await strapi.entityService.update(WORKFLOW_MODEL_UID, srcWorkflow.id, {
      data: {
        contentTypes: srcWorkflow.contentTypes.filter((ct) => ct !== uid),
      },
    });
  },

  async migrateEntities(destWorkflow, uid) {
    const newStage = destWorkflow.stages[0];

    return getService('stages').updateEntitiesStage(uid, {
      fromStageId: null,
      toStageId: newStage.id,
    });
  },
});

const diffContentTypes = (srcContentTypes, destContentTypes) => {
  const created = difference(destContentTypes, srcContentTypes);
  const deleted = difference(srcContentTypes, destContentTypes);
  return { created, deleted };
};
