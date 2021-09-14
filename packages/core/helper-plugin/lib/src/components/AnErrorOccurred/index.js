import React from 'react';
import AlertWarningIcon from '@strapi/icons/AlertWarningIcon';
import { EmptyStateLayout } from '@strapi/parts/EmptyStateLayout';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

const AnErrorOccurred = ({ content, ...rest }) => {
  const { formatMessage } = useIntl();

  return (
    <EmptyStateLayout
      icon={<AlertWarningIcon width="10rem" />}
      content={formatMessage(
        { id: content.id, defaultMessage: content.defaultMessage },
        content.values
      )}
      {...rest}
    />
  );
};

AnErrorOccurred.defaultProps = {
  content: {
    id: 'anErrorOccurred',
    defaultMessage: 'Woops! Something went wrong. Please, try again.',
    values: {},
  },
};

AnErrorOccurred.propTypes = {
  content: PropTypes.shape({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
    values: PropTypes.object,
  }),
};

export default AnErrorOccurred;
