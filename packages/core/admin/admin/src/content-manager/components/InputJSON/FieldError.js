import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Typography } from '@strapi/design-system/Typography';

export const FieldError = ({ id, error, name }) => {
  const { formatMessage } = useIntl();
  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';

  if (!error) {
    return null;
  }

  return (
    <Typography
      as="p"
      variant="pi"
      id={`${id || name}-error`}
      textColor="danger600"
      data-strapi-field-error
    >
      {errorMessage}
    </Typography>
  );
};

FieldError.defaultProps = {
  id: undefined,
  error: undefined,
};

FieldError.propTypes = {
  error: PropTypes.string,
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
};

export default FieldError;
