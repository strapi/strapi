import { forwardRef } from 'react';

import {
  NumberInput,
  useComposedRefs,
  Field,
  FieldLabel,
  FieldHint,
  FieldError,
} from '@strapi/design-system';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import { InputProps } from './types';

const NumberInputImpl = forwardRef<HTMLInputElement, InputProps>(
  ({ name, required, label, hint, labelAction, type, ...props }, ref) => {
    const field = useField<number>(name);
    const fieldRef = useFocusInputField<HTMLInputElement>(name);

    const composedRefs = useComposedRefs(ref, fieldRef);

    return (
      <Field error={field.error} name={name} hint={hint} required={required}>
        <FieldLabel action={labelAction}>{label}</FieldLabel>
        <NumberInput
          ref={composedRefs}
          defaultValue={field.initialValue}
          onValueChange={(value) => {
            field.onChange(name, value);
          }}
          step={type === 'float' || type == 'decimal' ? 0.01 : 1}
          value={field.value}
          {...props}
        />
        <FieldHint />
        <FieldError />
      </Field>
    );
  }
);

export { NumberInputImpl as NumberInput };
