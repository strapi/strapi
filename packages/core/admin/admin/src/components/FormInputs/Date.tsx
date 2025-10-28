import * as React from 'react';

import { DatePicker, useComposedRefs, Field } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import { InputProps } from './types';

const DateInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ name, required, label, hint, labelAction, type: _type, ...props }, ref) => {
    const { formatMessage } = useIntl();
    const field = useField(name);
    const fieldRef = useFocusInputField<HTMLInputElement>(name);
    const composedRefs = useComposedRefs(ref, fieldRef);
    const [lastValidDate, setLastValidDate] = React.useState<Date | null>(null);

    const value = typeof field.value === 'string' ? new Date(field.value) : field.value;

    const handleDateChange = (date: Date | undefined) => {
      if (!date) {
        field.onChange(name, null);
        setLastValidDate(null);
        return;
      }

      // Convert to UTC midnight
      const utcDate = toUTCMidnight(date);
      // Save as ISO string in UTC format
      field.onChange(name, utcDate.toISOString());
      setLastValidDate(utcDate);
    };

    // Render the DatePicker with UTC date
    return (
      <Field.Root error={field.error} name={name} hint={hint} required={required}>
        <Field.Label action={labelAction}>{label}</Field.Label>
        <DatePicker
          ref={composedRefs}
          clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
          onChange={handleDateChange}
          onClear={() => {
            field.onChange(name, null);
            setLastValidDate(null);
            return;
          }}
          onBlur={() => {
            // When the input is blurred, revert to the last valid date if the current value is invalid
            if (field.value && !value) {
              field.onChange(name, lastValidDate?.toISOString() ?? null);
            }
          }}
          value={value}
          {...props}
        />
        <Field.Hint />
        <Field.Error />
      </Field.Root>
    );
  }
);

// Ensure the conversion to UTC midnight
const toUTCMidnight = (date: Date) => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

const MemoizedDateInput = React.memo(DateInput);

export { MemoizedDateInput as DateInput };
