import * as React from 'react';

import { useField } from '@strapi/admin/strapi-admin';
import { Field, SingleSelect, SingleSelectOption, TextInput, Toggle } from '@strapi/design-system';
import { useIntl } from 'react-intl';

interface BaseFieldProps {
  /** The path of the value in the form: `fields.region` */
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
}

/** A text input kept in the surrounding `Form`, with its error shown under it */
const TextField = ({
  name,
  label,
  hint,
  required,
  disabled,
  type = 'text',
  placeholder,
  autoComplete,
}: BaseFieldProps & {
  type?: 'text' | 'url' | 'password';
  placeholder?: string;
  autoComplete?: string;
}) => {
  const field = useField<string>(name);

  return (
    <Field.Root name={name} error={field.error} hint={hint} required={required}>
      <Field.Label>{label}</Field.Label>
      <TextInput
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        value={field.value ?? ''}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
          field.onChange(name, event.target.value)
        }
      />
      <Field.Hint />
      <Field.Error />
    </Field.Root>
  );
};

/** A toggle with the admin's Enabled and Disabled words, as every settings toggle of the admin */
const ToggleField = ({ name, label, hint, disabled }: Omit<BaseFieldProps, 'required'>) => {
  const { formatMessage } = useIntl();
  const field = useField<boolean>(name);

  return (
    <Field.Root name={name} error={field.error} hint={hint}>
      <Field.Label>{label}</Field.Label>
      <Toggle
        checked={field.value === true}
        disabled={disabled}
        onLabel={formatMessage({
          id: 'app.components.ToggleCheckbox.enabled-label',
          defaultMessage: 'Enabled',
        })}
        offLabel={formatMessage({
          id: 'app.components.ToggleCheckbox.disabled-label',
          defaultMessage: 'Disabled',
        })}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
          field.onChange(name, event.target.checked)
        }
      />
      <Field.Hint />
      <Field.Error />
    </Field.Root>
  );
};

/** A choice among words, kept in the form as the chosen one */
const SelectField = ({
  name,
  label,
  hint,
  required,
  disabled,
  options,
}: BaseFieldProps & { options: Array<{ value: string; label: string }> }) => {
  const field = useField<string>(name);

  return (
    <Field.Root name={name} error={field.error} hint={hint} required={required}>
      <Field.Label>{label}</Field.Label>
      <SingleSelect
        value={field.value ? field.value : undefined}
        disabled={disabled}
        onChange={(next: string | number) => field.onChange(name, String(next))}
      >
        {options.map((option) => (
          <SingleSelectOption key={option.value} value={option.value}>
            {option.label}
          </SingleSelectOption>
        ))}
      </SingleSelect>
      <Field.Hint />
      <Field.Error />
    </Field.Root>
  );
};

export { SelectField, TextField, ToggleField };
