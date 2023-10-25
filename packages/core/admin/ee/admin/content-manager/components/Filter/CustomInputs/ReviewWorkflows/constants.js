import { getTrad } from '../../../../../../../admin/src/content-manager/utils';

import { AssigneeFilter } from './AssigneeFilter';
import { StageFilter } from './StageFilter';

export const REVIEW_WORKFLOW_FILTERS = [
  {
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
      customInput: StageFilter,

      label: {
        id: getTrad(`containers.ListPage.table-headers.reviewWorkflows.stage`),
        defaultMessage: 'Review stage',
      },
    },

    name: 'strapi_stage',
  },

  {
    fieldSchema: {
      type: 'relation',
      mainField: {
        name: 'id',

        schema: {
          type: 'int',
        },
      },
    },

    metadatas: {
      customInput: AssigneeFilter,

      customOperators: [
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$eq',
            defaultMessage: 'is',
          },
          value: '$eq',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$ne',
            defaultMessage: 'is not',
          },
          value: '$ne',
        },
      ],

      label: {
        id: getTrad(`containers.ListPage.table-headers.reviewWorkflows.assignee.label`),
        defaultMessage: 'Assignee',
      },
    },

    name: 'strapi_assignee',
  },
];
