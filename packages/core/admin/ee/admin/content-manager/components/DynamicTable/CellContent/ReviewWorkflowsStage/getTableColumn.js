import React from 'react';
import { useIntl } from 'react-intl';
import { Typography } from '@strapi/design-system';

import ReviewWorkflowsStage from '.';
import getTrad from '../../../../../../../admin/src/content-manager/utils/getTrad';

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
      type: 'custom',
    },
    metadatas: {
      label: formatMessage({
        id: getTrad(`containers.ListPage.table-headers.reviewWorkflows.stage`),
        defaultMessage: 'Review stage',
      }),
      searchable: false,
      sortable: false,
    },
    cellFormatter({ strapi_reviewWorkflows_stage }) {
      // if entities are created e.g. through lifecycle methods
      // they may not have a stage assigned
      if (!strapi_reviewWorkflows_stage) {
        return <Typography textColor="neutral800">-</Typography>;
      }

      return <ReviewWorkflowsStage name={strapi_reviewWorkflows_stage.name} />;
    },
  };
};
