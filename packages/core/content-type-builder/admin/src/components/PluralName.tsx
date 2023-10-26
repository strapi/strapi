import { useEffect, useRef } from 'react';

import { TextInput } from '@strapi/design-system';
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

  useEffect(() => {
    if (displayName) {
      const value = nameToSlug(displayName);

      try {
        const plural = pluralize(value, 2);
        onChangeRef.current({ target: { name, value: plural } });
      } catch (err) {
        onChangeRef.current({ target: { name, value } });
      }
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
    <TextInput
      error={errorMessage}
      label={label}
      id={name}
      hint={hint}
      name={name}
      onChange={onChange}
      value={value || ''}
    />
  );
};
