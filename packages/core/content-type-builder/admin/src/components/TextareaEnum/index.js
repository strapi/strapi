import React from 'react';

import { Textarea } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

const TextareaEnum = ({
  description,
  disabled,
  error,
  intlLabel,
  labelAction,
  name,
  onChange,
  placeholder,
  value,
}) => {
  const { formatMessage } = useIntl();
  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';
  const hint = description
    ? formatMessage(
        { id: description.id, defaultMessage: description.defaultMessage },
        { ...description.values }
      )
    : '';
  const label = formatMessage(intlLabel);
  const formattedPlaceholder = placeholder
    ? formatMessage(
        { id: placeholder.id, defaultMessage: placeholder.defaultMessage },
        { ...placeholder.values }
      )
    : '';

  const inputValue = Array.isArray(value) ? value.join('\n') : '';

  const handleChange = (e) => {
    const arrayValue = e.target.value.split('\n');

    onChange({ target: { name, value: arrayValue } });
  };

  return (
    <Textarea
      disabled={disabled}
      error={errorMessage}
      label={label}
      labelAction={labelAction}
      id={name}
      hint={hint}
      name={name}
      onChange={handleChange}
      placeholder={formattedPlaceholder}
      value={inputValue}
    >
      {inputValue}
    </Textarea>
  );
};

TextareaEnum.defaultProps = {
  description: null,
  disabled: false,
  error: '',
  labelAction: undefined,
  placeholder: null,
  value: '',
};

TextareaEnum.propTypes = {
  description: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
  disabled: PropTypes.bool,
  error: PropTypes.string,
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }).isRequired,
  labelAction: PropTypes.element,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
  value: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
};

export default TextareaEnum;
