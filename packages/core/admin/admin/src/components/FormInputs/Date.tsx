import { forwardRef, memo } from 'react';

import { getLocalTimeZone, parseAbsolute, toCalendarDate } from '@internationalized/date';
import { DatePicker, useComposedRefs, Field } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import { InputProps } from './types';

const DateInput = forwardRef<HTMLInputElement, InputProps>(
  ({ name, required, label, hint, labelAction, type: _type, ...props }, ref) => {
    const { formatMessage } = useIntl();
    const field = useField(name);
    const fieldRef = useFocusInputField<HTMLInputElement>(name);

    const composedRefs = useComposedRefs(ref, fieldRef);
    const value = typeof field.value === 'string' ? new Date(field.value) : field.value;

    return (
      <Field.Root error={field.error} name={name} hint={hint} required={required}>
        <Field.Label action={labelAction}>{label}</Field.Label>
        <DatePicker
          ref={composedRefs}
          clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
          onChange={(date) => {
            field.onChange(name, date ? convertLocalDateToUTCDate(date).toISOString() : null);
          }}
          onClear={() => field.onChange(name, null)}
          value={value ? convertLocalDateToUTCDate(value) : value}
          {...props}
        />
        <Field.Hint />
        <Field.Error />
      </Field.Root>
    );
  }
);

const convertLocalDateToUTCDate = (date: Date): Date => {
  const utcDateString = date.toISOString();
  const timeZone = getLocalTimeZone();
  const zonedDateTime = parseAbsolute(utcDateString, timeZone);

  /**
   * ZonedDateTime can't have weeks added,
   * see – https://github.com/adobe/react-spectrum/issues/3667
   */
  return toCalendarDate(zonedDateTime).toDate('UTC');
};

const MemoizedDateInput = memo(DateInput);

export { MemoizedDateInput as DateInput };
