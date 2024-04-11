export const WORKFLOW_MODEL_UID = 'plugin::review-workflows.workflow';
export const STAGE_MODEL_UID = 'plugin::review-workflows.workflow-stage';
/**
 * TODO: For V4 compatibility, the old UID was kept, when review workflows was in the admin package
 *
 * NOTE!: if you change this string you need to change it here too: strapi/packages/core/review-workflows/admin/src/routes/settings/components/Stages.tsx
 */
export const STAGE_TRANSITION_UID = 'admin::review-workflows.stage.transition';

export const STAGE_DEFAULT_COLOR = '#4945FF';
export const ENTITY_STAGE_ATTRIBUTE = 'strapi_stage';
export const ENTITY_ASSIGNEE_ATTRIBUTE = 'strapi_assignee';

export const MAX_WORKFLOWS = 200;
export const MAX_STAGES_PER_WORKFLOW = 200;

export const ERRORS = {
  WORKFLOW_WITHOUT_STAGES: 'A workflow must have at least one stage.',
  WORKFLOWS_LIMIT:
    'You’ve reached the limit of workflows in your plan. Delete a workflow or contact Sales to enable more workflows.',
  STAGES_LIMIT:
    'You’ve reached the limit of stages for this workflow in your plan. Try deleting some stages or contact Sales to enable more stages.',
  DUPLICATED_STAGE_NAME: 'Stage names must be unique.',
};

export const WORKFLOW_POPULATE = {
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
};
