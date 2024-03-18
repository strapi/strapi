import { forwardRef } from 'react';

import { NumberInput, useComposedRefs } from '@strapi/design-system';
import { useFocusInputField } from '@strapi/helper-plugin';

import { useField } from '../Form';

import { InputProps } from './types';

const NumberInputImpl = forwardRef<HTMLInputElement, InputProps>(({ type, ...props }, ref) => {
  const field = useField<number>(props.name);
  const fieldRef = useFocusInputField(props.name);

  const composedRefs = useComposedRefs<HTMLInputElement | null>(ref, fieldRef);

  return (
    // @ts-expect-error – label _could_ be a ReactNode since it's a child, this should be fixed in the DS.
    <NumberInput
      ref={composedRefs}
      defaultValue={field.initialValue}
      error={field.error}
      id={props.name}
      onValueChange={(value) => {
        field.onChange(props.name, value);
      }}
      step={type === 'float' || type == 'decimal' ? 0.01 : 1}
      value={field.value}
      {...props}
    />
  );
});

export { NumberInputImpl as NumberInput };
