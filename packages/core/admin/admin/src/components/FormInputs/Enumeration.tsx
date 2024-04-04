import { forwardRef } from 'react';

import { SingleSelect, SingleSelectOption, useComposedRefs } from '@strapi/design-system';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import { EnumerationProps } from './types';

export const EnumerationInput = forwardRef<any, EnumerationProps>(
  ({ options = [], ...props }, ref) => {
    const field = useField(props.name);
    const fieldRef = useFocusInputField(props.name);

    const composedRefs = useComposedRefs(ref, fieldRef);

    return (
      // @ts-expect-error – label _could_ be a ReactNode since it's a child, this should be fixed in the DS.
      <SingleSelect
        ref={composedRefs}
        error={field.error}
        onChange={(value) => {
          field.onChange(props.name, value);
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
    );
  }
);
