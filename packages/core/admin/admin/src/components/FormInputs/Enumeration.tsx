import { forwardRef, memo } from 'react';

import { SingleSelect, SingleSelectOption, useComposedRefs, Field } from '@strapi/design-system';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import { EnumerationProps } from './types';

const EnumerationInput = forwardRef<HTMLDivElement, EnumerationProps>(
  ({ name, required, label, hint, labelAction, options = [], ...props }, ref) => {
    const field = useField(name);
    const fieldRef = useFocusInputField<HTMLDivElement>(name);

    const composedRefs = useComposedRefs(ref, fieldRef);

    return (
      <Field.Root error={field.error} name={name} hint={hint} required={required}>
        <Field.Label action={labelAction}>{label}</Field.Label>
        <SingleSelect
          ref={composedRefs}
          onChange={(value) => {
            field.onChange(name, value);
          }}
          value={field.value}
          {...props}
        >
          {options.map(({ value, label, disabled, hidden }) => {
            return (
              <SingleSelectOption key={value} value={value} disabled={disabled} hidden={hidden}>
                {label ?? value}
              </SingleSelectOption>
            );
          })}
        </SingleSelect>
        <Field.Hint />
        <Field.Error />
      </Field.Root>
    );
  }
);

const MemoizedEnumerationInput = memo(EnumerationInput);

export { MemoizedEnumerationInput as EnumerationInput };
