import React from 'react';

import { Typography } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import getTrad from '../../../../../../admin/src/content-manager/utils/getTrad';

export function ReviewWorkflowsAssigneeEE({ firstname, lastname, displayname }) {
  const { formatMessage } = useIntl();

  // TODO align with changes from this PR, using the getDisplayName util
  // https://github.com/strapi/strapi/pull/17043/
  if (displayname) {
    return (
      <Typography textColor="neutral800">
        {formatMessage(
          {
            id: getTrad(`containers.ListPage.reviewWorkflows.assignee`),
            defaultMessage: '{displayname}',
          },
          { displayname }
        )}
      </Typography>
    );
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

ReviewWorkflowsAssigneeEE.defaultProps = {
  firstname: '',
  lastname: '',
  displayname: '',
};

ReviewWorkflowsAssigneeEE.propTypes = {
  firstname: PropTypes.string,
  lastname: PropTypes.string,
  displayname: PropTypes.string,
};
