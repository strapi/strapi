import * as React from 'react';

import { useQueryParams } from '@strapi/admin/strapi-admin';
import { DateTimePicker, useComposedRefs, Field } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import { InputProps } from './types';

const DateTimeInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ name, required, label, hint, labelAction, ...props }, ref) => {
    const { formatMessage } = useIntl();
    const field = useField<string | null>(name);
    const fieldRef = useFocusInputField<HTMLInputElement>(name);
    const [{ query }] = useQueryParams<{ plugins?: { i18n?: { locale?: string } } }>();

    const composedRefs = useComposedRefs(ref, fieldRef);
    const value = typeof field.value === 'string' ? new Date(field.value) : field.value;

    // Create a key that changes when locale changes to force re-render
    const localeKey = query?.plugins?.i18n?.locale || 'default';

    return (
      <Field.Root error={field.error} name={name} hint={hint} required={required}>
        <Field.Label action={labelAction}>{label}</Field.Label>
        <DateTimePicker
          key={`inputDateTime-${name}-${localeKey}`}
          ref={composedRefs}
          clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
          onChange={(date) => {
            // Store ISO string in the field, but Date object in the component value
            field.onChange(name, date ? date.toISOString() : null);
          }}
          onClear={() => field.onChange(name, null)}
          value={value}
          {...props}
        />
        <Field.Hint />
        <Field.Error />
      </Field.Root>
    );
  }
);

const MemoizedDateTimeInput = React.memo(DateTimeInput);

export { MemoizedDateTimeInput as DateTimeInput };
