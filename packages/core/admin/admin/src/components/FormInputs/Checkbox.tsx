import * as React from 'react';

import { Checkbox, useComposedRefs, Field } from '@strapi/design-system';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useLocaleKey } from '../../hooks/useLocaleKey';
import { useField } from '../Form';

import { InputProps } from './types';

const CheckboxInput = React.forwardRef<HTMLButtonElement, InputProps>(
  ({ name, required, label, hint, type: _type, ...props }, ref) => {
    const field = useField<boolean>(name);
    const fieldRef = useFocusInputField<HTMLButtonElement>(name);

    const composedRefs = useComposedRefs(ref, fieldRef);

    const localeKey = useLocaleKey();

    return (
      <Field.Root error={field.error} name={name} hint={hint} required={required}>
        <Checkbox
          key={`inputCheckbox-${name}-${localeKey}`}
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

const MemoizedCheckboxInput = React.memo(CheckboxInput);

export { MemoizedCheckboxInput as CheckboxInput };
