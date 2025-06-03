import { ReactNode, ChangeEvent } from 'react';

import { Field, Textarea } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import type { IntlLabel } from '../types';

interface TextareaEnumProps {
  description?: IntlLabel | null;
  disabled?: boolean;
  error?: string;
  intlLabel: IntlLabel;
  labelAction?: ReactNode;
  name: string;
  onChange: (value: { target: { name: string; value: string | string[] } }) => void;
  placeholder?: IntlLabel | null;
  value: string | string[] | undefined;
}

export const TextareaEnum = ({
  description = null,
  disabled = false,
  error = '',
  intlLabel,
  labelAction,
  name,
  onChange,
  placeholder = null,
  value = '',
}: TextareaEnumProps) => {
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

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const arrayValue = e.target.value.split('\n');

    onChange({ target: { name, value: arrayValue } });
  };

  return (
    <Field.Root error={errorMessage} hint={hint} name={name}>
      <Field.Label action={labelAction}>{label}</Field.Label>
      <Textarea
        disabled={disabled}
        onChange={handleChange}
        placeholder={formattedPlaceholder}
        value={inputValue}
      />
      <Field.Error />
      <Field.Hint />
    </Field.Root>
  );
};
