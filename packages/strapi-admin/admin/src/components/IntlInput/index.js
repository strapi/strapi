import React from 'react';
import { translatedErrors } from 'strapi-helper-plugin';
import { useIntl } from 'react-intl';
import { Inputs } from '@buffetjs/custom';
// import { Col } from 'reactstrap';
import PropTypes from 'prop-types';

const IntlInput = ({ label: labelId, defaultMessage, error, ...rest }) => {
  const { formatMessage } = useIntl();
  const label = formatMessage({ id: labelId, defaultMessage: defaultMessage || labelId });
  const translatedError = error ? formatMessage(error) : null;

  return (
    <Inputs {...rest} label={label} error={translatedError} translatedErrors={translatedErrors} />
  );
};

IntlInput.defaultProps = {
  defaultMessage: null,
  error: null,
};

IntlInput.propTypes = {
  defaultMessage: PropTypes.string,
  error: PropTypes.shape({
    id: PropTypes.string,
  }),
  label: PropTypes.string.isRequired,
};

export default IntlInput;
