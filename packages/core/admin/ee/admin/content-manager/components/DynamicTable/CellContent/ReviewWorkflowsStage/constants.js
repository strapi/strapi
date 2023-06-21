import React from 'react';

import { Typography } from '@strapi/design-system';

import getTrad from '../../../../../../../admin/src/content-manager/utils/getTrad';
import { STAGE_COLOR_DEFAULT } from '../../../../../pages/SettingsPage/pages/ReviewWorkflows/constants';

import ReviewWorkflowsStage from '.';

export const REVIEW_WORKFLOW_COLUMNS_EE = {
  key: '__strapi_reviewWorkflows_stage_temp_key__',
  name: 'strapi_reviewWorkflows_stage',
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
  cellFormatter({ strapi_reviewWorkflows_stage }) {
    // if entities are created e.g. through lifecycle methods
    // they may not have a stage assigned
    if (!strapi_reviewWorkflows_stage) {
      return <Typography textColor="neutral800">-</Typography>;
    }

    const { color, name } = strapi_reviewWorkflows_stage;

    return <ReviewWorkflowsStage color={color ?? STAGE_COLOR_DEFAULT} name={name} />;
  },
};
