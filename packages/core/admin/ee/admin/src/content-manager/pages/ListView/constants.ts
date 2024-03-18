import { getTranslation } from '../../../../../../admin/src/content-manager/utils/translations';
import { ASSIGNEE_ATTRIBUTE_NAME, STAGE_ATTRIBUTE_NAME } from '../EditView/components/constants';

import { AssigneeFilter } from './components/AssigneeFilter';
import { StageFilter } from './components/StageFilter';

import type { Filters } from '../../../../../../admin/src/components/Filters';
import type { ListFieldLayout } from '../../../../../../admin/src/content-manager/hooks/useDocumentLayout';
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
    mainField: {
      name: 'name',
      type: 'string',
    },
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
    mainField: {
      name: 'firstname',
      type: 'string',
    },
  },
] satisfies Array<Omit<ListFieldLayout, 'label'> & { label: MessageDescriptor }>;

export const REVIEW_WORKFLOW_FILTERS = [
  {
    mainField: {
      name: 'name',
      type: 'string',
    },
    input: StageFilter,
    label: {
      id: getTranslation(`containers.list.table-headers.reviewWorkflows.stage`),
      defaultMessage: 'Review stage',
    },
    name: 'strapi_stage',
    type: 'relation',
  },

  {
    type: 'relation',
    mainField: {
      name: 'id',
      type: 'integer',
    },
    input: AssigneeFilter,
    operators: [
      {
        label: {
          id: 'components.FilterOptions.FILTER_TYPES.$eq',
          defaultMessage: 'is',
        },
        value: '$eq',
      },
      {
        label: {
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
    name: 'strapi_assignee',
  },
] satisfies Array<
  Omit<Filters.Filter, 'label' | 'operators'> & {
    label: MessageDescriptor;
    operators?: Array<{ value: string; label: MessageDescriptor }>;
  }
>;
