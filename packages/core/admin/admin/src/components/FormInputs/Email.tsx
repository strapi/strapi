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
import { useField } from '../Form';

import type { StringProps } from './types';

export const EmailInput = forwardRef<HTMLInputElement, StringProps>(
  ({ name, required, label, hint, labelAction, ...props }, ref) => {
    const field = useField(name);
    const fieldRef = useFocusInputField<HTMLInputElement>(name);

    const composedRefs = useComposedRefs(ref, fieldRef);

    return (
      <Field error={field.error} name={name} hint={hint} required={required}>
        <FieldLabel action={labelAction}>{label}</FieldLabel>
        <TextInput
          ref={composedRefs}
          autoComplete="email"
          onChange={field.onChange}
          defaultValue={field.initialValue}
          value={field.value}
          {...props}
          type="email"
        />
        <FieldHint />
        <FieldError />
      </Field>
    );
  }
);
