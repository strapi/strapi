import { useEffect, useRef } from 'react';

import { Field, TextInput } from '@strapi/design-system';
import pluralize from 'pluralize';
import { useIntl } from 'react-intl';

import { nameToSlug } from '../utils/nameToSlug';

import type { IntlLabel } from '../types';

interface Description {
  id: string;
  defaultMessage: string;
  values?: Record<string, any>;
}

interface PluralNameProps {
  description?: Description;
  error?: string;
  intlLabel: IntlLabel;
  modifiedData: Record<string, any>;
  name: string;
  onChange: (value: { target: { name: string; value: string } }) => void;
  value?: string;
}

export const PluralName = ({
  description,
  error,
  intlLabel,
  modifiedData,
  name,
  onChange,
  value,
}: PluralNameProps) => {
  const { formatMessage } = useIntl();
  const onChangeRef = useRef(onChange);
  const displayName = modifiedData?.displayName || '';
  const previousDisplayName = useRef(displayName);
  const previousValue = useRef(value);

  useEffect(() => {
    if (displayName && displayName !== previousDisplayName.current) {
      const baseValue = nameToSlug(displayName);
      let newValue = baseValue;

      try {
        newValue = pluralize(baseValue, 2);
      } catch (err) {
        // If pluralize fails, use the base value
      }

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
    </Field.Root>
  );
};
