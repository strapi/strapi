import { forwardRef } from 'react';

import { TextInput } from '@strapi/design-system';
import { useFocusInputField } from '@strapi/helper-plugin';

import { useComposedRefs } from '../../content-manager/utils/refs';
import { useField } from '../Form';

import { InputProps } from './types';

export const EmailInput = forwardRef<any, InputProps>(
  ({ disabled, label, hint, name, placeholder, required }, ref) => {
    const field = useField(name);
    const fieldRef = useFocusInputField(name);

    const composedRefs = useComposedRefs(ref, fieldRef);

    return (
      <TextInput
        ref={composedRefs}
        autoComplete="email"
        disabled={disabled}
        error={field.error}
        label={label}
        id={name}
        hint={hint}
        name={name}
        onChange={field.onChange}
        placeholder={placeholder}
        required={required}
        type="email"
        defaultValue={field.initialValue}
        value={field.value}
      />
    );
  }
);
