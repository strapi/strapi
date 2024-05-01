import { forwardRef } from 'react';

import {
  JSONInput as JSONInputImpl,
  useComposedRefs,
  Field,
  FieldLabel,
  FieldHint,
  FieldError,
  JSONInputRef,
} from '@strapi/design-system';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import { InputProps } from './types';

export const JsonInput = forwardRef<JSONInputRef, InputProps>(
  ({ name, required, label, hint, labelAction, ...props }, ref) => {
    const field = useField(name);
    const fieldRef = useFocusInputField(name);

    const composedRefs = useComposedRefs(ref, fieldRef);

    return (
      <Field error={field.error} name={name} hint={hint} required={required}>
        <FieldLabel action={labelAction}>{label}</FieldLabel>
        <JSONInputImpl
          ref={composedRefs}
          value={field.value}
          onChange={(json) => {
            // Default to null when the field is not required and there is no input value
            const value = required && !json.length ? null : json;
            field.onChange(name, value);
          }}
          minHeight={`25.2rem`}
          maxHeight={`50.4rem`}
          {...props}
        />
        <FieldHint />
        <FieldError />
      </Field>
    );
  }
);
