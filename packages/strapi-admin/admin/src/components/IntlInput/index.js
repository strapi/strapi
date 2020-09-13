import React, { useMemo } from 'react';
import { translatedErrors } from 'strapi-helper-plugin';
import { useIntl } from 'react-intl';
import { Inputs } from '@buffetjs/custom';
import PropTypes from 'prop-types';

const IntlInput = ({ label: labelId, defaultMessage, error, ...rest }) => {
  const { formatMessage } = useIntl();
  const label = formatMessage({ id: labelId, defaultMessage: defaultMessage || labelId });
  const translatedError = error ? formatMessage(error) : null;
  const formattedErrors = useMemo(() => {
    return Object.keys(translatedErrors).reduce((acc, current) => {
      acc[current] = formatMessage({ id: translatedErrors[current] });

      return acc;
    }, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Inputs {...rest} label={label} error={translatedError} translatedErrors={formattedErrors} />
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
