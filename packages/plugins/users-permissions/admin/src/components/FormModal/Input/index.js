/**
 *
 * Input
 *
 */

import React from 'react';
import { useIntl } from 'react-intl';
import { ToggleCheckbox } from '@strapi/parts/ToggleCheckbox';
import { TextInput } from '@strapi/parts/TextInput';
import PropTypes from 'prop-types';

const Input = ({
  description,
  disabled,
  intlLabel,
  error,
  name,
  onChange,
  placeholder,
  providerToEditName,
  type,
  value,
}) => {
  const { formatMessage } = useIntl();
  const inputValue =
    name === 'noName' ? `${strapi.backendURL}/connect/${providerToEditName}/callback` : value;

  const label = formatMessage(
    { id: intlLabel.id, defaultMessage: intlLabel.defaultMessage },
    { ...intlLabel.values }
  );
  const hint = description
    ? formatMessage(
        { id: description.id, defaultMessage: description.defaultMessage },
        { ...description.values }
      )
    : '';

  if (type === 'bool') {
    return (
      <ToggleCheckbox
        checked={value}
        disabled={disabled}
        hint={hint}
        name={name}
        onLabel="On"
        onChange={onChange}
        offLabel="Off"
      >
        {label}
      </ToggleCheckbox>
    );
  }

  const formattedPlaceholder = placeholder
    ? formatMessage(
        { id: placeholder.id, defaultMessage: placeholder.defaultMessage },
        { ...placeholder.values }
      )
    : '';

  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';

  return (
    <TextInput
      disabled={disabled}
      error={errorMessage}
      label={label}
      name={name}
      onChange={onChange}
      placeholder={formattedPlaceholder}
      type={type}
      value={inputValue}
    />
  );
};

Input.defaultProps = {
  description: null,
  disabled: false,
  error: '',
  placeholder: null,
  value: '',
};

Input.propTypes = {
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
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
  providerToEditName: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
};

export default Input;
