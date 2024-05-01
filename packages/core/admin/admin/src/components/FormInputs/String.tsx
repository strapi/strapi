import { forwardRef } from 'react';

import {
  TextInput,
  useComposedRefs,
  Field,
  FieldLabel,
  FieldHint,
  FieldError,
} from '@strapi/design-system';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { type InputProps, useField } from '../Form';

export const StringInput = forwardRef<HTMLInputElement, InputProps>(
  ({ name, required, label, hint, labelAction, ...props }, ref) => {
    const field = useField(name);
    const fieldRef = useFocusInputField<HTMLInputElement>(name);

    const composedRefs = useComposedRefs(ref, fieldRef);

    return (
      <Field error={field.error} name={name} hint={hint} required={required}>
        <FieldLabel action={labelAction}>{label}</FieldLabel>
        <TextInput
          ref={composedRefs}
          defaultValue={field.initialValue}
          onChange={field.onChange}
          value={field.value ?? ''}
          {...props}
        />
        <FieldHint />
        <FieldError />
      </Field>
    );
  }
);
