import React from 'react';

import { Typography } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import getTrad from '../../../../../../admin/src/content-manager/utils/getTrad';

export function ReviewWorkflowsAssigneeEE({ firstname, lastname }) {
  const { formatMessage } = useIntl();

  if (!firstname && !lastname) {
    return <Typography textColor="neutral800">-</Typography>;
  }

  return (
    <Typography textColor="neutral800">
      {formatMessage(
        {
          id: getTrad(`containers.ListPage.reviewWorkflows.assignee`),
          defaultMessage: '{firstname} {lastname}',
        },
        { firstname, lastname }
      )}
    </Typography>
  );
}

// TODO are both required?
ReviewWorkflowsAssigneeEE.propTypes = {
  firstname: PropTypes.string.isRequired,
  lastname: PropTypes.string.isRequired,
};
