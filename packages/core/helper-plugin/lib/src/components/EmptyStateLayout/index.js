import React from 'react';
import { EmptyStateLayout as Layout } from '@strapi/parts/EmptyStateLayout';
import EmptyStateDocument from '@strapi/icons/EmptyStateDocument';
import EmptyStatePermissions from '@strapi/icons/EmptyStatePermissions';
import EmptyStatePicture from '@strapi/icons/EmptyStatePicture';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';

const icons = {
  document: EmptyStateDocument,
  media: EmptyStatePicture,
  permissions: EmptyStatePermissions,
};

const EmptyStateLayout = ({ action, content, hasRadius, icon, shadow }) => {
  const Icon = icons[icon];
  const { formatMessage } = useIntl();

  return (
    <Layout
      action={action}
      content={formatMessage(
        { id: content.id, defaultMessage: content.defaultMessage },
        content.values
      )}
      hasRadius={hasRadius}
      icon={<Icon width="10rem" />}
      shadow={shadow}
    />
  );
};

EmptyStateLayout.defaultProps = {
  action: undefined,
  content: {
    id: 'app.components.EmptyStateLayout.content-document',
    defaultMessage: "You don't have any content yet...",
    values: {},
  },
  hasRadius: true,
  icon: 'document',
  shadow: 'tableShadow',
};

EmptyStateLayout.propTypes = {
  action: PropTypes.any,
  content: PropTypes.shape({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
    values: PropTypes.object,
  }),
  hasRadius: PropTypes.bool,
  icon: PropTypes.oneOf(['document', 'media', 'permissions']),
  shadow: PropTypes.string,
};

export default EmptyStateLayout;
