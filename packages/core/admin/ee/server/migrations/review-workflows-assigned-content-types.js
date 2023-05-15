'use strict';

const { WORKFLOW_MODEL_UID } = require('../constants/workflows');

async function migrateReviewWorkflowsAssignedContentTypes({ oldContentTypes, contentTypes }) {
  // Look for RW assignedContentTypes attribute
  const hadAssignedContentTypes =
    !!oldContentTypes?.[WORKFLOW_MODEL_UID]?.attributes?.assignedContentTypes;
  const hasAssignedContentTypes =
    !!contentTypes?.[WORKFLOW_MODEL_UID]?.attributes?.assignedContentTypes;

  if (!hadAssignedContentTypes && hasAssignedContentTypes) {
    // TODO: If it was enabled, assign the default workflow.
    await strapi.query(WORKFLOW_MODEL_UID).updateMany({
      data: {
        assignedContentTypes: [],
      },
    });
  }
}

module.exports = migrateReviewWorkflowsAssignedContentTypes;
