/**
 *
 * Input
 *
 */

import * as React from 'react';

import { TextInput, Toggle, Field } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import type { Translation, PermissionChangeEvent } from '../../../types';

type Props = {
  description?: Translation;
  disabled?: boolean;
  intlLabel: Translation;
  error?: string;
  name: string;
  onChange: (event: PermissionChangeEvent) => void;
  placeholder?: Translation;
  providerToEditName: string;
  type: string;
  value?: boolean | string;
};

/** Renders a provider setting or the generated OAuth callback URL. */
const Input = ({
  description,
  disabled = false,
  intlLabel,
  error,
  name,
  onChange,
  placeholder,
  providerToEditName,
  type,
  value = '',
}: Props) => {
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
          checked={value === true}
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
        value={typeof inputValue === 'string' ? inputValue : ''}
      />
      <Field.Error />
    </Field.Root>
  );
};

export { Input };
