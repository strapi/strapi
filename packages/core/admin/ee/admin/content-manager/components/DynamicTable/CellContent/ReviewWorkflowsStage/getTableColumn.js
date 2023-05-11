import React from 'react';
import { useIntl } from 'react-intl';
import { Typography } from '@strapi/design-system';

import ReviewWorkflowsStage from '.';
import getTrad from '../../../../../../../admin/src/content-manager/utils/getTrad';
import { STAGE_COLOR_DEFAULT } from '../../../../../pages/SettingsPage/pages/ReviewWorkflows/constants';

export default (layout) => {
  const { formatMessage } = useIntl();

  // TODO: As soon as the feature was enabled in EE mode, the BE currently does not have a way to send
  // `false` once a user is in CE mode again. We shouldn't have to perform the window.strapi.isEE check here
  // and it is meant to be in interim solution until we find a better one.
  const hasReviewWorkflows =
    (window.strapi.features.isEnabled(window.strapi.features.REVIEW_WORKFLOWS) &&
      layout.contentType.options?.reviewWorkflows) ??
    false;

  if (!hasReviewWorkflows) {
    return null;
  }

  return {
    key: '__strapi_reviewWorkflows_stage_temp_key__',
    name: 'strapi_reviewWorkflows_stage',
    fieldSchema: {
      type: 'relation',
    },
    metadatas: {
      label: formatMessage({
        id: getTrad(`containers.ListPage.table-headers.reviewWorkflows.stage`),
        defaultMessage: 'Review stage',
      }),
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
};
