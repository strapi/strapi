/**
 *
 * Input
 *
 */

import React from 'react';

import { TextInput, Toggle, Field } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

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
    name === 'noName'
      ? `${window.strapi.backendURL}/api/connect/${providerToEditName}/callback`
      : value;

  const label = formatMessage(
    { id: intlLabel.id, defaultMessage: intlLabel.defaultMessage },
    { provider: providerToEditName, ...intlLabel.values }
  );
  const hint = description
    ? formatMessage(
        { id: description.id, defaultMessage: description.defaultMessage },
        { provider: providerToEditName, ...description.values }
      )
    : '';

  if (type === 'bool') {
    return (
      <Field.Root hint={hint} name={name}>
        <Field.Label>{label}</Field.Label>
        <Toggle
          aria-label={name}
          checked={value}
          disabled={disabled}
          offLabel={formatMessage({
            id: 'app.components.ToggleCheckbox.off-label',
            defaultMessage: 'Off',
          })}
          onLabel={formatMessage({
            id: 'app.components.ToggleCheckbox.on-label',
            defaultMessage: 'On',
          })}
          onChange={(e) => {
            onChange({ target: { name, value: e.target.checked } });
          }}
        />
        <Field.Hint />
      </Field.Root>
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
    <Field.Root error={errorMessage} name={name}>
      <Field.Label>{label}</Field.Label>
      <TextInput
        disabled={disabled}
        onChange={onChange}
        placeholder={formattedPlaceholder}
        type={type}
        value={inputValue}
      />
      <Field.Error />
    </Field.Root>
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
