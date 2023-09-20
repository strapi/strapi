import getTrad from '../../../../../../admin/src/content-manager/utils/getTrad';
import {
  ASSIGNEE_ATTRIBUTE_NAME,
  STAGE_ATTRIBUTE_NAME,
} from '../../EditView/InformationBox/constants';

export const REVIEW_WORKFLOW_COLUMNS_EE = [
  {
    key: `__${STAGE_ATTRIBUTE_NAME}_temp_key__`,
    name: STAGE_ATTRIBUTE_NAME,
    fieldSchema: {
      type: 'relation',
    },
    metadatas: {
      // formatMessage() will be applied when the column is rendered
      label: {
        id: getTrad(`containers.ListPage.table-headers.reviewWorkflows.stage`),
        defaultMessage: 'Review stage',
      },
      searchable: false,
      sortable: true,
      mainField: {
        name: 'name',
        schema: {
          type: 'string',
        },
      },
    },
  },
  {
    key: `__${ASSIGNEE_ATTRIBUTE_NAME}_temp_key__`,
    name: ASSIGNEE_ATTRIBUTE_NAME,
    fieldSchema: {
      type: 'relation',
    },
    metadatas: {
      label: {
        id: getTrad(`containers.ListPage.table-headers.reviewWorkflows.assignee`),
        defaultMessage: 'Assignee',
      },
      searchable: false,
      sortable: true,
      mainField: {
        name: 'firstname',
        schema: {
          type: 'string',
        },
      },
    },
  },
];
