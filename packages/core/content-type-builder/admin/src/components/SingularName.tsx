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
  const displayName = modifiedData?.displayName || '';

  useEffect(() => {
    if (displayName) {
      onChangeRef.current({ target: { name, value: nameToSlug(displayName) } });
    } else {
      onChangeRef.current({ target: { name, value: '' } });
    }
  }, [displayName, name]);

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
      <TextInput onChange={onChange} value={value || ''} />
      <Field.Error />
      <Field.Hint />
    </Field.Root>
  );
};
