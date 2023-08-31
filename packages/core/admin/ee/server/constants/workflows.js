'use strict';

// TODO concatenate admin + content type singular name
module.exports = {
  WORKFLOW_MODEL_UID: 'admin::workflow',
  STAGE_MODEL_UID: 'admin::workflow-stage',
  STAGE_TRANSITION_UID: 'admin::review-workflows.stage.transition',
  STAGE_DEFAULT_COLOR: '#4945FF',
  ENTITY_STAGE_ATTRIBUTE: 'strapi_stage',
  ENTITY_ASSIGNEE_ATTRIBUTE: 'strapi_assignee',
  MAX_WORKFLOWS: 200,
  MAX_STAGES_PER_WORKFLOW: 200,
  ERRORS: {
    WORKFLOW_WITHOUT_STAGES: 'A workflow must have at least one stage.',
    WORKFLOWS_LIMIT:
      'You’ve reached the limit of workflows in your plan. Delete a workflow or contact Sales to enable more workflows.',
    STAGES_LIMIT:
      'You’ve reached the limit of stages for this workflow in your plan. Try deleting some stages or contact Sales to enable more stages.',
    DUPLICATED_STAGE_NAME: 'Stage names must be unique.',
  },
  WORKFLOW_POPULATE: {
    stages: {
      populate: {
        permissions: {
          fields: ['action', 'actionParameters'],
          populate: {
            role: { fields: ['id', 'name'] },
          },
        },
      },
    },
  },
};
