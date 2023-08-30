'use strict';

/**
 * In 4.13.0 we decided users&permissions user content type will no longer be assigned to a workflow
 * This migration cleanly un-assigns the user content type if it was assigned to a workflow
 */
const { isNil } = require('lodash/fp');
const { getService } = require('../utils');
const workflowContentTypesManager = require('../services/review-workflows/workflows/content-types');

async function migrateWorkflowsFilterUsersContentType({ oldContentTypes, contentTypes }) {
  const userHadWorkflowStage = !isNil(
    oldContentTypes['plugin::users-permissions.user']?.attributes.strapi_stage
  );
  const userHasWorkflowStage = !isNil(
    contentTypes['plugin::users-permissions.user']?.attributes.strapi_stage
  );

  // If the user content type no longer has a workflow stage, it means
  // this is the version where we decided to disable RW from the user content type
  if (userHadWorkflowStage && !userHasWorkflowStage) {
    const workflowService = getService('workflows', { strapi });

    // Find if the user content type is assigned to a workflow
    const assignedWorkflow = await workflowService.getAssignedWorkflow(
      'plugin::users-permissions.user'
    );

    if (assignedWorkflow) {
      await workflowContentTypesManager({ strapi }).unassignContentType(
        assignedWorkflow,
        'plugin::users-permissions.user'
      );
    }
  }
}

module.exports = migrateWorkflowsFilterUsersContentType;
