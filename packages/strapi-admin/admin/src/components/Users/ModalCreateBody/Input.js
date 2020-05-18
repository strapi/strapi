import React from 'react';
import { useGlobalContext, translatedErrors } from 'strapi-helper-plugin';
import { Inputs } from '@buffetjs/custom';
import { Col } from 'reactstrap';
import PropTypes from 'prop-types';

const Input = ({ label: labelId, error, ...rest }) => {
  const { formatMessage } = useGlobalContext();
  const label = formatMessage({ id: labelId });
  const translatedError = error ? formatMessage(error) : null;

  return (
    <Col xs="6">
      <Inputs {...rest} label={label} error={translatedError} translatedErrors={translatedErrors} />
    </Col>
  );
};

Input.defaultProps = {
  error: null,
};

Input.propTypes = {
  error: PropTypes.shape({
    id: PropTypes.string,
  }),
  label: PropTypes.string.isRequired,
};

export default Input;
