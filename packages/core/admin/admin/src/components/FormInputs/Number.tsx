import * as React from 'react';

import { NumberInput, useComposedRefs, Field } from '@strapi/design-system';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useLocaleKey } from '../../hooks/useLocaleKey';
import { useField } from '../Form';

import { InputProps } from './types';

const NumberInputImpl = React.forwardRef<HTMLInputElement, InputProps>(
  ({ name, required, label, hint, labelAction, type, ...props }, ref) => {
    const field = useField<number | null>(name);
    const fieldRef = useFocusInputField<HTMLInputElement>(name);
    const localeKey = useLocaleKey();

    const composedRefs = useComposedRefs(ref, fieldRef);

    return (
      <Field.Root error={field.error} name={name} hint={hint} required={required}>
        <Field.Label action={labelAction}>{label}</Field.Label>
        <NumberInput
          key={`inputNumber-${name}-${localeKey}`}
          ref={composedRefs}
          onValueChange={(value) => {
            // Convert undefined to null to store it in the form state
            // See https://github.com/strapi/strapi/issues/22533
            field.onChange(name, value ?? null);
          }}
          step={type === 'float' || type === 'decimal' ? 0.01 : 1}
          value={field.value ?? undefined}
          {...props}
        />
        <Field.Hint />
        <Field.Error />
      </Field.Root>
    );
  }
);

const MemoizedNumberInput = React.memo(NumberInputImpl);

export { MemoizedNumberInput as NumberInput };
