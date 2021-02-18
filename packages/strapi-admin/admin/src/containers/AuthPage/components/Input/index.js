import React from 'react';
import { Inputs } from '@buffetjs/custom';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

const Input = ({ error, label, placeholder, ...rest }) => {
  const { formatMessage } = useIntl();
  const labelMessage = formatMessage({ id: label });
  const placeholderMessage = placeholder ? formatMessage({ id: placeholder }) : '';
  let errorMessage = error;

  if (error) {
    errorMessage = formatMessage(error);
  }

  return (
    <Inputs {...rest} error={errorMessage} label={labelMessage} placeholder={placeholderMessage} />
  );
};

Input.defaultProps = {
  error: null,
  placeholder: null,
};

Input.propTypes = {
  error: PropTypes.object,
  label: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
};

export default Input;
