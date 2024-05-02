import { forwardRef } from 'react';

import { Checkbox, useComposedRefs, Field } from '@strapi/design-system';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import { InputProps } from './types';

const CheckboxInput = forwardRef<HTMLInputElement, InputProps>(
  ({ name, required, label, hint, ...props }, ref) => {
    const field = useField<boolean>(name);
    const fieldRef = useFocusInputField<HTMLInputElement>(name);

    const composedRefs = useComposedRefs(ref, fieldRef);

    return (
      <Field.Root error={field.error} name={name} hint={hint} required={required}>
        <Checkbox
          onValueChange={(checked) => field.onChange(name, checked)}
          ref={composedRefs}
          value={field.value}
          {...props}
        >
          {label || props['aria-label']}
        </Checkbox>
        <Field.Hint />
        <Field.Error />
      </Field.Root>
    );
  }
);

export { CheckboxInput };
