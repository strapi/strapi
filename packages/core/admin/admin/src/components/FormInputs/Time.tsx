import { forwardRef } from 'react';

import {
  TimePicker,
  useComposedRefs,
  Field,
  FieldLabel,
  FieldHint,
  FieldError,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import { InputProps } from './types';

const TimeInput = forwardRef<HTMLInputElement, InputProps>(
  ({ name, required, label, hint, labelAction, ...props }, ref) => {
    const { formatMessage } = useIntl();
    const field = useField<string>(name);
    const fieldRef = useFocusInputField<HTMLInputElement>(name);

    const composedRefs = useComposedRefs(ref, fieldRef);

    return (
      <Field error={field.error} name={name} hint={hint} required={required}>
        <FieldLabel action={labelAction}>{label}</FieldLabel>
        <TimePicker
          ref={composedRefs}
          clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
          onChange={(time) => {
            field.onChange(name, time);
          }}
          onClear={() => field.onChange(name, undefined)}
          value={field.value ?? ''}
          {...props}
        />
        <FieldHint />
        <FieldError />
      </Field>
    );
  }
);

export { TimeInput };
