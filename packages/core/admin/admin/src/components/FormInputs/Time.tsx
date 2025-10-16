import * as React from 'react';

import { useQueryParams } from '@strapi/admin/strapi-admin';
import { TimePicker, useComposedRefs, Field } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import { InputProps } from './types';

const TimeInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ name, required, label, hint, labelAction, ...props }, ref) => {
    const { formatMessage } = useIntl();
    const field = useField<string>(name);
    const fieldRef = useFocusInputField<HTMLInputElement>(name);
    const [{ query }] = useQueryParams<{ plugins?: { i18n?: { locale?: string } } }>();

    const composedRefs = useComposedRefs(ref, fieldRef);

    // Create a key that changes when locale changes to force re-render
    const localeKey = query?.plugins?.i18n?.locale || 'default';

    return (
      <Field.Root error={field.error} name={name} hint={hint} required={required}>
        <Field.Label action={labelAction}>{label}</Field.Label>
        <TimePicker
          key={`inputTime-${name}-${localeKey}`}
          ref={composedRefs}
          clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
          onChange={(time) => {
            field.onChange(name, `${time}:00.000`);
          }}
          onClear={() => field.onChange(name, undefined)}
          value={field.value ?? ''}
          {...props}
        />
        <Field.Hint />
        <Field.Error />
      </Field.Root>
    );
  }
);

const MemoizedTimeInput = React.memo(TimeInput);

export { MemoizedTimeInput as TimeInput };
