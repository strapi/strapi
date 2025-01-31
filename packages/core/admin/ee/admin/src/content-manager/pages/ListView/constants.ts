import { getTranslation } from '../../../../../../admin/src/content-manager/utils/translations';
import { ASSIGNEE_ATTRIBUTE_NAME, STAGE_ATTRIBUTE_NAME } from '../EditView/components/constants';

import { AssigneeFilter } from './components/AssigneeFilter';
import { StageFilter } from './components/StageFilter';

import type { TableHeader } from '../../../../../../admin/src/content-manager/pages/ListView/ListViewPage';
import type { FilterData } from '@strapi/helper-plugin';
import type { MessageDescriptor } from 'react-intl';

interface NonTranslatedTableHeader extends Omit<TableHeader, 'metadatas'> {
  metadatas: Omit<TableHeader['metadatas'], 'label'> & {
    label: MessageDescriptor;
  };
}

export const REVIEW_WORKFLOW_COLUMNS_EE = [
  {
    key: `__${STAGE_ATTRIBUTE_NAME}_temp_key__`,
    name: STAGE_ATTRIBUTE_NAME,
    fieldSchema: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'admin::review-workflow-stage',
    },
    metadatas: {
      // formatMessage() will be applied when the column is rendered
      label: {
        id: getTranslation(`containers.ListPage.table-headers.reviewWorkflows.stage`),
        defaultMessage: 'Review stage',
      },
      searchable: false,
      sortable: true,
      mainField: {
        name: 'name',
        type: 'string',
      },
    },
  },
  {
    key: `__${ASSIGNEE_ATTRIBUTE_NAME}_temp_key__`,
    name: ASSIGNEE_ATTRIBUTE_NAME,
    fieldSchema: {
      type: 'relation',
      target: 'admin::user',
      relation: 'oneToMany',
    },
    metadatas: {
      label: {
        id: getTranslation(`containers.ListPage.table-headers.reviewWorkflows.assignee`),
        defaultMessage: 'Assignee',
      },
      searchable: false,
      sortable: true,
      mainField: {
        name: 'firstname',
        type: 'string',
      },
    },
  },
] satisfies NonTranslatedTableHeader[];

export const REVIEW_WORKFLOW_FILTERS = [
  {
    fieldSchema: {
      type: 'relation',
      mainField: {
        name: 'name',
        type: 'string',
      },
    },

    metadatas: {
      customInput: StageFilter,

      label: {
        id: getTranslation(`containers.ListPage.table-headers.reviewWorkflows.stage`),
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
        type: 'integer',
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
        id: getTranslation(`containers.ListPage.table-headers.reviewWorkflows.assignee.label`),
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
