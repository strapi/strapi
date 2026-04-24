/**
 *
 * Input
 *
 */

import * as React from 'react';

import { TextInput, Toggle, Field } from '@strapi/design-system';
import { useIntl, type MessageDescriptor } from 'react-intl';

interface IntlMessage extends MessageDescriptor {
  values?: Record<string, React.ReactNode>;
}

interface InputProps {
  description?: IntlMessage | null;
  disabled?: boolean;
  error?: string;
  intlLabel: IntlMessage;
  name: string;
  onChange: (event: { target: { name: string; value: string | boolean } }) => void;
  placeholder?: IntlMessage | null;
  providerToEditName: string;
  type: string;
  value?: boolean | string;
}

const Input = ({
  description = null,
  disabled = false,
  intlLabel,
  error = '',
  name,
  onChange,
  placeholder = null,
  providerToEditName,
  type,
  value = '',
}: InputProps) => {
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
          checked={value as boolean}
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
    ? (formatMessage(
        { id: placeholder.id, defaultMessage: placeholder.defaultMessage },
        { ...placeholder.values }
      ) as string)
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
        value={inputValue as string}
      />
      <Field.Error />
    </Field.Root>
  );
};

export default Input;
