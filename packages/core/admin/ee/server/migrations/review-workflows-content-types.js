'use strict';

const { get, keys, pickBy, pipe } = require('lodash/fp');
const { WORKFLOW_MODEL_UID } = require('../constants/workflows');

async function migrateWorkflowsContentTypes({ oldContentTypes, contentTypes }) {
  // Look for RW contentTypes attribute
  const hadContentTypes = !!oldContentTypes?.[WORKFLOW_MODEL_UID]?.attributes?.contentTypes;
  const hasContentTypes = !!contentTypes?.[WORKFLOW_MODEL_UID]?.attributes?.contentTypes;

  if (!hadContentTypes && hasContentTypes) {
    // Initialize contentTypes with an empty array and assign only to one
    // workflow the Content Types which were using Review Workflow before.
    await strapi.query(WORKFLOW_MODEL_UID).updateMany({ data: { contentTypes: [] } });

    // Find Content Types which were using Review Workflow before
    const contentTypes = pipe([pickBy(get('options.reviewWorkflows')), keys])(oldContentTypes);

    if (contentTypes.length) {
      // Update only one workflow with the contentTypes
      // Before this release there was only one workflow, so this operation is safe.
      await strapi
        .query(WORKFLOW_MODEL_UID)
        .update({ where: { id: { $notNull: true } }, data: { contentTypes } });
    }
  }
}

module.exports = migrateWorkflowsContentTypes;
