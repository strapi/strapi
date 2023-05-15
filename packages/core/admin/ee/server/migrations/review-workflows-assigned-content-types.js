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
    // Initialize assignedContentTypes with an empty array and assign only to one
    // workflow the Content Types which were using Review Workflow before.
    await strapi.query(WORKFLOW_MODEL_UID).updateMany({ data: { assignedContentTypes: [] } });

    // Find Content Types which were using Review Workflow before
    const assignedContentTypes = pipe([pickBy(get('options.reviewWorkflows')), keys])(
      oldContentTypes
    );

    if (assignedContentTypes.length) {
      // Update only one workflow with the assignedContentTypes
      // Before this release there was only one workflow, so this operation is safe.
      await strapi
        .query(WORKFLOW_MODEL_UID)
        .update({ where: { id: { $notNull: true } }, data: { assignedContentTypes } });
    }
  }
}

module.exports = migrateReviewWorkflowsAssignedContentTypes;
