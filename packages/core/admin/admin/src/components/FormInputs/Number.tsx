import { forwardRef, memo, type FocusEventHandler } from 'react';

import { NumberInput, useComposedRefs, Field } from '@strapi/design-system';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useSelectOnFocus } from '../../hooks/useSelectOnFocus';
import { useField } from '../Form';

import { InputProps } from './types';

const NumberInputImpl = forwardRef<
  HTMLInputElement,
  InputProps & { onFocus?: FocusEventHandler<HTMLElement> }
>(({ name, required, label, hint, labelAction, type, onFocus: onFocusProp, ...props }, ref) => {
  const field = useField<number | null>(name);
  const fieldRef = useFocusInputField<HTMLInputElement>(name);
  const { onFocus } = useSelectOnFocus<HTMLInputElement>(onFocusProp);

  const composedRefs = useComposedRefs(ref, fieldRef);

  return (
    <Field.Root error={field.error} name={name} hint={hint} required={required}>
      <Field.Label action={labelAction}>{label}</Field.Label>
      <NumberInput
        ref={composedRefs}
        onValueChange={(value) => {
          // Convert undefined to null to store it in the form state
          // See https://github.com/strapi/strapi/issues/22533
          field.onChange(name, value ?? null);
        }}
        onFocus={onFocus}
        step={type === 'float' || type === 'decimal' ? 0.01 : 1}
        value={field.value ?? undefined}
        {...props}
      />
      <Field.Hint />
      <Field.Error />
    </Field.Root>
  );
});

const MemoizedNumberInput = memo(NumberInputImpl);

export { MemoizedNumberInput as NumberInput };
