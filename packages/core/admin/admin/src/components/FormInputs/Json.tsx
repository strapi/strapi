import { forwardRef } from 'react';

import { JSONInput as JSONInputImpl } from '@strapi/design-system';
import { useFocusInputField } from '@strapi/helper-plugin';

import { useComposedRefs } from '../../utils/refs';
import { useField } from '../Form';

import { InputProps } from './types';

/**
 * TODO: fix the ref type when the design system is fixed.
 */
export const JsonInput = forwardRef<any, InputProps>(
  ({ disabled, label, hint, name, required }, ref) => {
    const field = useField(name);
    const fieldRef = useFocusInputField(name);

    const composedRefs = useComposedRefs(ref, fieldRef);

    return (
      <JSONInputImpl
        ref={composedRefs}
        // @ts-expect-error – label _could_ be a ReactNode since it's a child, this should be fixed in the DS.
        label={label}
        value={field.value}
        error={field.error}
        disabled={disabled}
        hint={hint}
        required={required}
        onChange={(json) => {
          // Default to null when the field is not required and there is no input value
          const value = required && !json.length ? null : json;
          field.onChange(name, value);
        }}
        minHeight={`${252 / 16}rem`}
        maxHeight={`${504 / 16}rem`}
      />
    );
  }
);
