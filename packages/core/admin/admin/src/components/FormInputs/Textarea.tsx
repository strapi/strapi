import { forwardRef } from 'react';

import { Textarea } from '@strapi/design-system';
import { useFocusInputField } from '@strapi/helper-plugin';

import { useComposedRefs } from '../../utils/refs';
import { useField } from '../Form';

import { StringProps } from './types';

export const TextareaInput = forwardRef<any, StringProps>(
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
        // @ts-expect-error – label _could_ be a ReactNode since it's a child, this should be fixed in the DS.
        label={label}
        id={name}
        hint={hint}
        name={name}
        onChange={field.onChange}
        required={required}
        placeholder={placeholder}
        value={field.value ?? ''}
      />
    );
  }
);
