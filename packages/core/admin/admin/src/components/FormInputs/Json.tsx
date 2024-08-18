import * as React from 'react';

import {
  JSONInput as JSONInputImpl,
  useComposedRefs,
  Field,
  JSONInputRef,
} from '@strapi/design-system';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import { InputProps } from './types';

const JsonInput = React.forwardRef<JSONInputRef, InputProps>(
  ({ name, required, label, hint, labelAction, ...props }, ref) => {
    const field = useField(name);
    const fieldRef = useFocusInputField(name);

    const composedRefs = useComposedRefs(ref, fieldRef);

    return (
      <Field.Root error={field.error} name={name} hint={hint} required={required}>
        <Field.Label action={labelAction}>{label}</Field.Label>
        <JSONInputImpl
          ref={composedRefs}
          value={
            typeof field.value == 'object' ? JSON.stringify(field.value, null, 2) : field.value
          }
          onChange={(json) => {
            // Default to null when the field is not required and there is no input value
            const value = required && !json.length ? null : json;
            field.onChange(name, value);
          }}
          minHeight={`25.2rem`}
          maxHeight={`50.4rem`}
          {...props}
        />
        <Field.Hint />
        <Field.Error />
      </Field.Root>
    );
  }
);

const MemoizedJsonInput = React.memo(JsonInput);

export { MemoizedJsonInput as JsonInput };
