import React, { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { Inputs } from '@buffetjs/custom';
import PropTypes from 'prop-types';
import { isObject } from 'lodash';
import translatedErrors from '../../utils/translatedErrors';

const IntlInput = ({
  description,
  label,
  defaultMessage,
  error,
  placeholder: placeholderId,
  ...rest
}) => {
  const { formatMessage } = useIntl();

  let formattedDescription = '';
  let formattedLabel = '';

  if (label) {
    const params = label.params || {};

    formattedLabel = isObject(label)
      ? formatMessage({ id: label.id, defaultMessage: label.defaultMessage || label.id }, params)
      : formatMessage({ id: label, defaultMessage: label });
  }

  if (description) {
    const params = description.params || {};

    formattedDescription = isObject(description)
      ? formatMessage(
          { id: description.id, defaultMessage: description.defaultMessage || description.id },
          params
        )
      : formatMessage({ id: description, defaultMessage: description });
  }
  const placeholder = placeholderId
    ? formatMessage({ id: placeholderId, defaultMessage: placeholderId })
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
      label={formattedLabel}
      description={formattedDescription}
      error={translatedError}
      translatedErrors={formattedErrors}
      placeholder={placeholder}
    />
  );
};

IntlInput.defaultProps = {
  defaultMessage: null,
  description: null,
  error: null,
  placeholder: null,
};

IntlInput.propTypes = {
  defaultMessage: PropTypes.string,
  description: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  error: PropTypes.shape({
    id: PropTypes.string,
  }),
  label: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
};

export default IntlInput;
