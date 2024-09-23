import { forwardRef, memo } from 'react';

import { DateTimePicker, useComposedRefs, Field } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import { InputProps } from './types';

const DateTimeInput = forwardRef<HTMLInputElement, InputProps>(
  ({ name, required, label, hint, labelAction, ...props }, ref) => {
    const { formatMessage } = useIntl();
    const field = useField<string | null>(name);
    const fieldRef = useFocusInputField<HTMLInputElement>(name);

    const composedRefs = useComposedRefs(ref, fieldRef);
    const value = typeof field.value === 'string' ? new Date(field.value) : field.value;

    return (
      <Field.Root error={field.error} name={name} hint={hint} required={required}>
        <Field.Label action={labelAction}>{label}</Field.Label>
        <DateTimePicker
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

const MemoizedDateTimeInput = memo(DateTimeInput);

export { MemoizedDateTimeInput as DateTimeInput };
