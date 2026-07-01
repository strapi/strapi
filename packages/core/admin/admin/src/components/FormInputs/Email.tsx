import { forwardRef, memo } from 'react';

import { TextInput, useComposedRefs, Field } from '@strapi/design-system';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useSelectOnFocus } from '../../hooks/useSelectOnFocus';
import { useField } from '../Form';

import type { StringProps } from './types';

const EmailInput = forwardRef<HTMLInputElement, StringProps>(
  ({ name, required, label, hint, labelAction, onFocus: onFocusProp, ...props }, ref) => {
    const field = useField(name);
    const fieldRef = useFocusInputField<HTMLInputElement>(name);
    const { onFocus } = useSelectOnFocus<HTMLInputElement>(onFocusProp);

    const composedRefs = useComposedRefs(ref, fieldRef);

    return (
      <Field.Root error={field.error} name={name} hint={hint} required={required}>
        <Field.Label action={labelAction}>{label}</Field.Label>
        <TextInput
          ref={composedRefs}
          autoComplete="email"
          onChange={field.onChange}
          onFocus={onFocus}
          value={field.value}
          {...props}
          type="email"
        />
        <Field.Hint />
        <Field.Error />
      </Field.Root>
    );
  }
);

const MemoizedEmailInput = memo(EmailInput);

export { MemoizedEmailInput as EmailInput };
