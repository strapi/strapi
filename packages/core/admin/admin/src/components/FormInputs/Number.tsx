import * as React from 'react';

import { useQueryParams } from '@strapi/admin/strapi-admin';
import { NumberInput, useComposedRefs, Field } from '@strapi/design-system';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import { InputProps } from './types';

const NumberInputImpl = React.forwardRef<HTMLInputElement, InputProps>(
  ({ name, required, label, hint, labelAction, type, ...props }, ref) => {
    const field = useField<number | null>(name);
    const fieldRef = useFocusInputField<HTMLInputElement>(name);
    const [{ query }] = useQueryParams<{ plugins?: { i18n?: { locale?: string } } }>();

    const composedRefs = useComposedRefs(ref, fieldRef);

    // Create a stable key that only changes when locale changes to force re-render
    const localeKey = query?.plugins?.i18n?.locale || 'default';

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
