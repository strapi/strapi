import React from 'react';
import { EmptyStateLayout as Layout } from '@strapi/parts/EmptyStateLayout';
import { EmptyStateDocument, EmptyStatePermissions, EmptyStatePicture } from '@strapi/icons';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';

const icons = {
  document: EmptyStateDocument,
  media: EmptyStatePicture,
  permissions: EmptyStatePermissions,
};

const EmptyStateLayout = ({ action, content, icon }) => {
  const Icon = icons[icon];
  const { formatMessage } = useIntl();

  return (
    <Layout
      action={action}
      content={formatMessage(
        { id: content.id, defaultMessage: content.defaultMessage },
        content.values
      )}
      icon={<Icon width="10rem" />}
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
  icon: 'document',
};

EmptyStateLayout.propTypes = {
  action: PropTypes.any,
  content: PropTypes.shape({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
    values: PropTypes.object,
  }),
  icon: PropTypes.oneOf(['document', 'media', 'permissions']),
};

export default EmptyStateLayout;
