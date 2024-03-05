import { forwardRef } from 'react';

import { TextInput } from '@strapi/design-system';
import { useFocusInputField } from '@strapi/helper-plugin';

import { useComposedRefs } from '../../utils/refs';
import { useField } from '../Form';

import type { StringProps } from './types';

export const EmailInput = forwardRef<any, StringProps>(
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
        // @ts-expect-error – label _could_ be a ReactNode since it's a child, this should be fixed in the DS.
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
