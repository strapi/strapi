import React from 'react';
import EmptyStateDocument from '@strapi/icons/EmptyStateDocument';
import { EmptyStateLayout } from '@strapi/parts/EmptyStateLayout';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

const NoContent = ({ content, ...rest }) => {
  const { formatMessage } = useIntl();

  return (
    <EmptyStateLayout
      icon={<EmptyStateDocument width="10rem" />}
      {...rest}
      content={formatMessage(
        { id: content.id, defaultMessage: content.defaultMessage },
        content.values
      )}
    />
  );
};

NoContent.defaultProps = {
  content: {
    id: 'app.components.EmptyStateLayout.content-document',
    defaultMessage: "You don't have any content yet...",
    values: {},
  },
};

NoContent.propTypes = {
  content: PropTypes.shape({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
    values: PropTypes.object,
  }),
};

export default NoContent;
