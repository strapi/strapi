import React from 'react';

import { Typography } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { getDisplayName } from '../../../../../../admin/src/content-manager/utils';

export function ReviewWorkflowsAssigneeEE({ user }) {
  const { formatMessage } = useIntl();

  return <Typography textColor="neutral800">{getDisplayName(user, formatMessage)}</Typography>;
}

ReviewWorkflowsAssigneeEE.propTypes = {
  user: PropTypes.shape({
    firstname: PropTypes.string,
    lastname: PropTypes.string,
    username: PropTypes.string,
  }).isRequired,
};
