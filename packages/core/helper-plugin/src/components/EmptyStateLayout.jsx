import React from 'react';

import { EmptyStateLayout as Layout } from '@strapi/design-system';
import { EmptyDocuments, EmptyPermissions, EmptyPictures } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

const icons = {
  document: EmptyDocuments,
  media: EmptyPictures,
  permissions: EmptyPermissions,
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
    defaultMessage: 'No content found',
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

export { EmptyStateLayout };
