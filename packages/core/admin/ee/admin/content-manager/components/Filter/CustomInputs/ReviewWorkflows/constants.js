import { getTrad } from '../../../../../../../admin/src/content-manager/utils';

import { ReviewWorkflowsFilter } from './ReviewWorkflowsFilter';

export const REVIEW_WORKFLOW_STAGE_FILTER = {
  fieldSchema: {
    type: 'relation',
    mainField: {
      name: 'name',

      schema: {
        type: 'string',
      },
    },
  },

  metadatas: {
    customInput: ReviewWorkflowsFilter,

    label: {
      id: getTrad(`containers.ListPage.table-headers.reviewWorkflows.stage`),
      defaultMessage: 'Review stage',
    },
  },

  name: 'strapi_stage',
};
