import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Typography } from '@strapi/design-system';

export const Hint = ({ id, error, name, description }) => {
  const { formatMessage } = useIntl();
  const hint = description
    ? formatMessage(
        { id: description.id, defaultMessage: description.defaultMessage },
        { ...description.values }
      )
    : '';

  if (!hint || error) {
    return null;
  }

  return (
    <Typography as="p" variant="pi" id={`${id || name}-hint`} textColor="neutral600">
      {hint}
    </Typography>
  );
};

Hint.defaultProps = {
  id: undefined,
  description: undefined,
  error: undefined,
};

Hint.propTypes = {
  description: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
  error: PropTypes.string,
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
};

export default Hint;
