import getTrad from '../../../../../../admin/src/content-manager/utils/getTrad';

export const REVIEW_WORKFLOW_COLUMNS_EE = {
  key: '__strapi_stage_temp_key__',
  name: 'strapi_stage',
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
};
