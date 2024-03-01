import { forwardRef } from 'react';

import { Checkbox } from '@strapi/design-system';
import { useFocusInputField } from '@strapi/helper-plugin';

import { useComposedRefs } from '../../utils/refs';
import { useField } from '../Form';

import { InputProps } from './types';

const CheckboxInput = forwardRef<HTMLInputElement, InputProps>(
  ({ disabled, label, hint, name, required }, ref) => {
    const field = useField<boolean>(name);
    const fieldRef = useFocusInputField(name);

    const composedRefs = useComposedRefs<HTMLInputElement | null>(ref, fieldRef);

    return (
      <Checkbox
        disabled={disabled}
        hint={hint}
        name={name}
        onValueChange={(checked) => field.onChange(name, checked)}
        ref={composedRefs}
        required={required}
        value={field.value}
      >
        {label}
      </Checkbox>
    );
  }
);

export { CheckboxInput };
