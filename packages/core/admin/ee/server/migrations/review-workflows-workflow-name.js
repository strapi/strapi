'use strict';

const { WORKFLOW_MODEL_UID } = require('../constants/workflows');
const defaultWorkflow = require('../constants/default-workflow.json');

async function migrateReviewWorkflowName({ oldContentTypes, contentTypes }) {
  // Look for RW name attribute
  const hadName = !!oldContentTypes?.[WORKFLOW_MODEL_UID]?.attributes?.name;
  const hasName = !!contentTypes?.[WORKFLOW_MODEL_UID]?.attributes?.name;

  // Add the default workflow name if name attribute was added
  if (!hadName && hasName) {
    await strapi.query(WORKFLOW_MODEL_UID).updateMany({
      data: {
        name: defaultWorkflow.name,
      },
    });
  }
}

module.exports = migrateReviewWorkflowName;
