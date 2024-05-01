import { forwardRef } from 'react';

import { Checkbox, useComposedRefs, Field, FieldHint, FieldError } from '@strapi/design-system';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import { InputProps } from './types';

const CheckboxInput = forwardRef<HTMLInputElement, InputProps>(
  ({ name, required, label, hint, ...props }, ref) => {
    const field = useField<boolean>(name);
    const fieldRef = useFocusInputField<HTMLInputElement>(name);

    const composedRefs = useComposedRefs(ref, fieldRef);

    return (
      <Field error={field.error} name={name} hint={hint} required={required}>
        <Checkbox
          onValueChange={(checked) => field.onChange(name, checked)}
          ref={composedRefs}
          value={field.value}
          {...props}
        >
          {label || props['aria-label']}
        </Checkbox>
        <FieldHint />
        <FieldError />
      </Field>
    );
  }
);

export { CheckboxInput };
