'use strict';

const { get, keys, pickBy, pipe } = require('lodash/fp');
const { WORKFLOW_MODEL_UID } = require('../constants/workflows');

async function migrateReviewWorkflowsAssignedContentTypes({ oldContentTypes, contentTypes }) {
  // Look for RW assignedContentTypes attribute
  const hadAssignedContentTypes =
    !!oldContentTypes?.[WORKFLOW_MODEL_UID]?.attributes?.assignedContentTypes;
  const hasAssignedContentTypes =
    !!contentTypes?.[WORKFLOW_MODEL_UID]?.attributes?.assignedContentTypes;

  if (!hadAssignedContentTypes && hasAssignedContentTypes) {
    // If RW was enabled on CT, assign the default workflow.
    const reviewWorkflowContentTypes = pipe([pickBy(get('options.reviewWorkflows')), keys])(
      oldContentTypes
    );

    // Before this release there was only one workflow,
    // so it is safe to assign the default workflow to all content types.
    await strapi.query(WORKFLOW_MODEL_UID).updateMany({
      data: {
        assignedContentTypes: reviewWorkflowContentTypes.length ? reviewWorkflowContentTypes : [],
      },
    });
  }
}

module.exports = migrateReviewWorkflowsAssignedContentTypes;
