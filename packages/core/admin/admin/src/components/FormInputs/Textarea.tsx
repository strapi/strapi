import * as React from 'react';

import { Textarea, useComposedRefs, Field } from '@strapi/design-system';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useLocaleKey } from '../../hooks/useLocaleKey';
import { useField } from '../Form';

import type { StringProps } from './types';

const TextareaInput = React.forwardRef<HTMLTextAreaElement, StringProps>(
  ({ name, required, label, hint, labelAction, ...props }, ref) => {
    const field = useField(name);
    const fieldRef = useFocusInputField<HTMLTextAreaElement>(name);

    const composedRefs = useComposedRefs(ref, fieldRef);

    const localeKey = useLocaleKey();

    return (
      <Field.Root error={field.error} name={name} hint={hint} required={required}>
        <Field.Label action={labelAction}>{label}</Field.Label>
        <Textarea
          key={`inputTextarea-${name}-${localeKey}`}
          ref={composedRefs}
          onChange={field.onChange}
          value={field.value ?? ''}
          {...props}
        />
        <Field.Hint />
        <Field.Error />
      </Field.Root>
    );
  }
);

const MemoizedTextareaInput = React.memo(TextareaInput);

export { MemoizedTextareaInput as TextareaInput };
