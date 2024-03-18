import { forwardRef } from 'react';

import { DatePicker, useComposedRefs } from '@strapi/design-system';
import { useFocusInputField } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

import { useField } from '../Form';

import { InputProps } from './types';

const DateInput = forwardRef<HTMLInputElement, InputProps>(({ type: _type, ...props }, ref) => {
  const { formatMessage } = useIntl();
  const field = useField<Date>(props.name);
  const fieldRef = useFocusInputField(props.name);

  const composedRefs = useComposedRefs<HTMLInputElement | null>(ref, fieldRef);
  const value = typeof field.value === 'string' ? new Date(field.value) : field.value;

  return (
    // @ts-expect-error – label _could_ be a ReactNode since it's a child, this should be fixed in the DS.
    <DatePicker
      ref={composedRefs}
      clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
      error={field.error}
      id={props.name}
      onChange={(date) => {
        field.onChange(props.name, date);
      }}
      onClear={() => field.onChange(props.name, undefined)}
      selectedDate={value}
      {...props}
    />
  );
});

export { DateInput };
