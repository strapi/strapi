import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import EmptyStatePermissions from '@strapi/icons/EmptyStatePermissions';
import { EmptyStateLayout } from '@strapi/parts/EmptyStateLayout';

const NoPermissions = ({ action }) => {
  const { formatMessage } = useIntl();

  return (
    <EmptyStateLayout
      icon={<EmptyStatePermissions width="10rem" />}
      content={formatMessage({
        id: 'app.components.EmptyStateLayout.content-permissions',
        defaultMessage: "You don't have the permissions to access that content",
      })}
      action={action}
    />
  );
};

NoPermissions.defaultProps = {
  action: undefined,
};

NoPermissions.propTypes = {
  action: PropTypes.node,
};

export default NoPermissions;
