import { forwardRef } from 'react';

import { TextInput } from '@strapi/design-system';
import { useFocusInputField } from '@strapi/helper-plugin';

import { useComposedRefs } from '../../utils/refs';
import { useField } from '../Form';

import { InputProps } from './types';

/**
 * TODO: fix the ref type when the design system is fixed.
 */
export const StringInput = forwardRef<any, InputProps>(
  ({ disabled, label, hint, name, placeholder }, ref) => {
    const field = useField(name);
    const fieldRef = useFocusInputField(name);

    const composedRefs = useComposedRefs(ref, fieldRef);

    return (
      <TextInput
        ref={composedRefs}
        disabled={disabled}
        hint={hint}
        label={label}
        name={name}
        error={field.error}
        defaultValue={field.initialValue}
        onChange={field.onChange}
        placeholder={placeholder}
        value={field.value ?? ''}
      />
    );
  }
);
