import { forwardRef, memo } from 'react';

import { TextInput, useComposedRefs, Field } from '@strapi/design-system';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { type InputProps, useField } from '../Form';

const StringInput = forwardRef<HTMLInputElement, InputProps>(
  ({ name, required, label, hint, labelAction, ...props }, ref) => {
    const field = useField(name);
    const fieldRef = useFocusInputField<HTMLInputElement>(name);

    const composedRefs = useComposedRefs(ref, fieldRef);

    return (
      <Field.Root error={field.error} name={name} hint={hint} required={required}>
        <Field.Label action={labelAction}>{label}</Field.Label>
        <TextInput
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

const MemoizedStringInput = memo(StringInput);

export { MemoizedStringInput as StringInput };
