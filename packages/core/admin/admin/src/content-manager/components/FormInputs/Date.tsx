import { forwardRef } from 'react';

import { DatePicker } from '@strapi/design-system';
import { useFocusInputField } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

import { useComposedRefs } from '../../utils/refs';
import { useField } from '../Form';

import { InputProps } from './types';

const DateInput = forwardRef<HTMLInputElement, InputProps>(
  ({ disabled, label, hint, name, required, placeholder }, ref) => {
    const { formatMessage } = useIntl();
    const field = useField<Date>(name);
    const fieldRef = useFocusInputField(name);

    const composedRefs = useComposedRefs<HTMLInputElement | null>(ref, fieldRef);
    const value = typeof field.value === 'string' ? new Date(field.value) : field.value;

    return (
      <DatePicker
        ref={composedRefs}
        clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
        disabled={disabled}
        error={field.error}
        label={label}
        id={name}
        hint={hint}
        name={name}
        onChange={(date) => {
          field.onChange(name, date);
        }}
        onClear={() => field.onChange(name, undefined)}
        placeholder={placeholder}
        required={required}
        selectedDate={value}
      />
    );
  }
);

export { DateInput };
