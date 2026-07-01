import { forwardRef, memo } from 'react';

import { Textarea, useComposedRefs, Field } from '@strapi/design-system';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useSelectOnFocus } from '../../hooks/useSelectOnFocus';
import { useField } from '../Form';

import type { StringProps } from './types';

const TextareaInput = forwardRef<HTMLTextAreaElement, StringProps>(
  ({ name, required, label, hint, labelAction, onFocus: onFocusProp, ...props }, ref) => {
    const field = useField(name);
    const fieldRef = useFocusInputField<HTMLTextAreaElement>(name);
    const { onFocus } = useSelectOnFocus<HTMLTextAreaElement>(onFocusProp);

    const composedRefs = useComposedRefs(ref, fieldRef);

    return (
      <Field.Root error={field.error} name={name} hint={hint} required={required}>
        <Field.Label action={labelAction}>{label}</Field.Label>
        <Textarea
          ref={composedRefs}
          onChange={field.onChange}
          onFocus={onFocus}
          value={field.value ?? ''}
          {...props}
        />
        <Field.Hint />
        <Field.Error />
      </Field.Root>
    );
  }
);

const MemoizedTextareaInput = memo(TextareaInput);

export { MemoizedTextareaInput as TextareaInput };
