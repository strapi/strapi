import { forwardRef } from 'react';

import { TimePicker } from '@strapi/design-system';
import { useFocusInputField } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

import { useComposedRefs } from '../../utils/refs';
import { useField } from '../Form';

import { InputProps } from './types';

const TimeInput = forwardRef<HTMLInputElement, InputProps>(
  ({ disabled, label, hint, name, required }, ref) => {
    const { formatMessage } = useIntl();
    const field = useField<string>(name);
    const fieldRef = useFocusInputField(name);

    const composedRefs = useComposedRefs<HTMLInputElement | null>(ref, fieldRef);

    return (
      <TimePicker
        ref={composedRefs}
        clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
        disabled={disabled}
        error={field.error}
        label={label}
        id={name}
        hint={hint}
        name={name}
        onChange={(time) => {
          field.onChange(name, time);
        }}
        onClear={() => field.onChange(name, undefined)}
        required={required}
        value={field.value}
      />
    );
  }
);

export { TimeInput };
