import { forwardRef } from 'react';

import { Textarea } from '@strapi/design-system';
import { useFocusInputField } from '@strapi/helper-plugin';

import { useComposedRefs } from '../../utils/refs';
import { useField } from '../Form';

import { InputProps } from './types';

export const TextareaInput = forwardRef<any, InputProps>(
  ({ name, disabled, hint, label, placeholder, required }, ref) => {
    const field = useField(name);
    const fieldRef = useFocusInputField(name);

    const composedRefs = useComposedRefs(ref, fieldRef);

    return (
      <Textarea
        ref={composedRefs}
        disabled={disabled}
        defaultValue={field.initialValue}
        error={field.error}
        label={label}
        id={name}
        hint={hint}
        name={name}
        onChange={field.onChange}
        required={required}
        placeholder={placeholder}
        value={field.value}
      />
    );
  }
);
