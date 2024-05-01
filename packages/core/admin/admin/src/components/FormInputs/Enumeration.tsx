import { forwardRef } from 'react';

import {
  SingleSelect,
  SingleSelectOption,
  useComposedRefs,
  Field,
  FieldLabel,
  FieldHint,
  FieldError,
} from '@strapi/design-system';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import { EnumerationProps } from './types';

export const EnumerationInput = forwardRef<HTMLDivElement, EnumerationProps>(
  ({ name, required, label, hint, labelAction, options = [], ...props }, ref) => {
    const field = useField(name);
    const fieldRef = useFocusInputField<HTMLDivElement>(name);

    const composedRefs = useComposedRefs(ref, fieldRef);

    return (
      <Field error={field.error} name={name} hint={hint} required={required}>
        <FieldLabel action={labelAction}>{label}</FieldLabel>
        <SingleSelect
          ref={composedRefs}
          error={field.error}
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
        <FieldHint />
        <FieldError />
      </Field>
    );
  }
);
