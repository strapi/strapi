import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { P } from '@strapi/design-system/Text';

export const FieldError = ({ id, error, name }) => {
  const { formatMessage } = useIntl();
  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';

  if (!error) {
    return null;
  }

  return (
    <P small id={`${id || name}-error`} textColor="danger600" data-strapi-field-error>
      {errorMessage}
    </P>
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
