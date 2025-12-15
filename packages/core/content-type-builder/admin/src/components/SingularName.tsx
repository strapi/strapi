import { useEffect, useRef } from 'react';

import { Field, TextInput } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { nameToSlug } from '../utils/nameToSlug';

import type { IntlLabel } from '../types';

interface SingularNameProps {
  description?: IntlLabel | null;
  error?: string | null;
  intlLabel: IntlLabel;
  modifiedData: Record<string, any>;
  name: string;
  onChange: (value: { target: { name: string; value: string } }) => void;
  value?: string | null;
}

export const SingularName = ({
  description = null,
  error = null,
  intlLabel,
  modifiedData,
  name,
  onChange,
  value = null,
}: SingularNameProps) => {
  const { formatMessage } = useIntl();
  const onChangeRef = useRef(onChange);
  const previousValue = useRef(value);
  const previousDisplayName = useRef(modifiedData?.displayName || '');
  const displayName = modifiedData?.displayName || '';

  useEffect(() => {
    if (displayName && displayName !== previousDisplayName.current) {
      const newValue = nameToSlug(displayName);
      onChangeRef.current({ target: { name, value: newValue } });
      previousValue.current = newValue;
      previousDisplayName.current = displayName;
    } else if (!displayName) {
      onChangeRef.current({ target: { name, value: '' } });
      previousValue.current = '';
      previousDisplayName.current = '';
    }
  }, [displayName, name, value]);

  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';
  const hint = description
    ? formatMessage(
        { id: description.id, defaultMessage: description.defaultMessage },
        { ...description.values }
      )
    : '';
  const label = formatMessage(intlLabel);

  return (
    <Field.Root error={errorMessage} hint={hint} name={name}>
      <Field.Label>{label}</Field.Label>
      <TextInput onChange={onChange} value={value || ''} type="text" />
      <Field.Error />
      <Field.Hint />
    </Field.Root>
  );
};
