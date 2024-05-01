import { forwardRef } from 'react';

import {
  Textarea,
  useComposedRefs,
  Field,
  FieldLabel,
  FieldHint,
  FieldError,
} from '@strapi/design-system';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import type { StringProps } from './types';

export const TextareaInput = forwardRef<HTMLTextAreaElement, StringProps>(
  ({ name, required, label, hint, labelAction, ...props }, ref) => {
    const field = useField(name);
    const fieldRef = useFocusInputField<HTMLTextAreaElement>(name);

    const composedRefs = useComposedRefs(ref, fieldRef);

    return (
      <Field error={field.error} name={name} hint={hint} required={required}>
        <FieldLabel action={labelAction}>{label}</FieldLabel>
        <Textarea
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
