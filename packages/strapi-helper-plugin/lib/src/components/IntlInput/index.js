import React, { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { Inputs } from '@buffetjs/custom';
import PropTypes from 'prop-types';
import translatedErrors from '../../utils/translatedErrors';

const IntlInput = ({
  description: descriptionId,
  label: labelId,
  defaultMessage,
  error,
  ...rest
}) => {
  const { formatMessage } = useIntl();
  const label = formatMessage({ id: labelId, defaultMessage: defaultMessage || labelId });
  const description = descriptionId
    ? formatMessage({ id: descriptionId, defaultMessage: descriptionId })
    : '';
  const translatedError = error ? formatMessage(error) : null;
  const formattedErrors = useMemo(() => {
    return Object.keys(translatedErrors).reduce((acc, current) => {
      acc[current] = formatMessage({ id: translatedErrors[current] });

      return acc;
    }, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Inputs
      {...rest}
      label={label}
      description={description}
      error={translatedError}
      translatedErrors={formattedErrors}
    />
  );
};

IntlInput.defaultProps = {
  defaultMessage: null,
  description: null,
  error: null,
};

IntlInput.propTypes = {
  defaultMessage: PropTypes.string,
  description: PropTypes.string,
  error: PropTypes.shape({
    id: PropTypes.string,
  }),
  label: PropTypes.string.isRequired,
};

export default IntlInput;
