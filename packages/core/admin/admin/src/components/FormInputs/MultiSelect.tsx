import { forwardRef, memo } from 'react';

import { MultiSelect, MultiSelectOption, useComposedRefs, Field } from '@strapi/design-system';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import { MultiSelectProps } from './types';

const MultiSelectInput = forwardRef<HTMLDivElement, MultiSelectProps>(
  ({ name, required, label, hint, labelAction, options = [], ...props }, ref) => {
    const field = useField<string[] | null>(name);
    const fieldRef = useFocusInputField<HTMLDivElement>(name);

    const composedRefs = useComposedRefs(ref, fieldRef);

    return (
      <Field.Root error={field.error} name={name} hint={hint} required={required}>
        <Field.Label action={labelAction}>{label}</Field.Label>
        <MultiSelect
          ref={composedRefs}
          onChange={(value: string[]) => field.onChange(name, value)}
          value={field.value ?? []}
          withTags
          {...props}
        >
          {options.map(({ value, label }) => (
            <MultiSelectOption key={value} value={value}>
              {label ?? value}
            </MultiSelectOption>
          ))}
        </MultiSelect>
        <Field.Hint />
        <Field.Error />
      </Field.Root>
    );
  }
);

const MemoizedMultiSelectInput = memo(MultiSelectInput);

export { MemoizedMultiSelectInput as MultiSelectInput };
