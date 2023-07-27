export const REVIEW_WORKFLOW_ASSIGNEE_SORT_OPTIONS = [
  {
    value: 'strapi_stage[name]',
    label: {
      id: 'settings.defaultSortOrder.reviewWorkflows.stage.label',
      defaultMessage: 'Review Stage',
    },
  },

  {
    value: 'strapi_assignee[name]',
    label: {
      id: 'settings.defaultSortOrder.reviewWorkflows.assignee.label',
      defaultMessage: 'Assignee',
    },
  },
];
