import { getTranslation } from '../../../../../../admin/src/content-manager/utils/translations';
import { ASSIGNEE_ATTRIBUTE_NAME, STAGE_ATTRIBUTE_NAME } from '../EditView/components/constants';

import { AssigneeFilter } from './components/AssigneeFilter';
import { StageFilter } from './components/StageFilter';

import type { ListFieldLayout } from '../../../../../../admin/src/content-manager/hooks/useDocumentLayout';
import type { FilterData } from '@strapi/helper-plugin';
import type { MessageDescriptor } from 'react-intl';

export const REVIEW_WORKFLOW_COLUMNS_EE = [
  {
    name: STAGE_ATTRIBUTE_NAME,
    attribute: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'admin::review-workflow-stage',
    },
    label: {
      id: getTranslation(`containers.list.table-headers.reviewWorkflows.stage`),
      defaultMessage: 'Review stage',
    },
    searchable: false,
    sortable: true,
    mainField: 'name',
  },
  {
    name: ASSIGNEE_ATTRIBUTE_NAME,
    attribute: {
      type: 'relation',
      target: 'admin::user',
      relation: 'oneToMany',
    },
    label: {
      id: getTranslation(`containers.list.table-headers.reviewWorkflows.assignee`),
      defaultMessage: 'Assignee',
    },
    searchable: false,
    sortable: true,
    mainField: 'firstname',
  },
] satisfies ListFieldLayout[];

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
        id: getTranslation(`containers.list.table-headers.reviewWorkflows.stage`),
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
          type: 'integer',
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
        id: getTranslation(`containers.list.table-headers.reviewWorkflows.assignee.label`),
        defaultMessage: 'Assignee',
      },
    },

    name: 'strapi_assignee',
  },
] satisfies Array<
  Omit<FilterData, 'metadatas'> & {
    metadatas: Omit<FilterData['metadatas'], 'label'> & {
      label: MessageDescriptor;
    };
  }
>;
