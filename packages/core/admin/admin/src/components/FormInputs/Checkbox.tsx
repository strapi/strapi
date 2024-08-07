import { forwardRef, memo } from 'react';

import { Checkbox, useComposedRefs, Field } from '@strapi/design-system';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import { InputProps } from './types';

const CheckboxInput = forwardRef<HTMLButtonElement, InputProps>(
  ({ name, required, label, hint, type: _type, ...props }, ref) => {
    const field = useField<boolean>(name);
    const fieldRef = useFocusInputField<HTMLButtonElement>(name);

    const composedRefs = useComposedRefs(ref, fieldRef);

    return (
      <Field.Root error={field.error} name={name} hint={hint} required={required}>
        <Checkbox
          onCheckedChange={(checked) => field.onChange(name, !!checked)}
          ref={composedRefs}
          checked={field.value}
          {...props}
        >
          {label || props['aria-label']}
        </Checkbox>
        <Field.Hint />
        <Field.Error />
      </Field.Root>
    );
  }
);

const MemoizedCheckboxInput = memo(CheckboxInput);

export { MemoizedCheckboxInput as CheckboxInput };
