import { forwardRef } from 'react';

import { Checkbox, useComposedRefs } from '@strapi/design-system';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import { InputProps } from './types';

const CheckboxInput = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const field = useField<boolean>(props.name);
  const fieldRef = useFocusInputField(props.name);

  const composedRefs = useComposedRefs<HTMLInputElement | null>(ref, fieldRef);

  return (
    <Checkbox
      onValueChange={(checked) => field.onChange(props.name, checked)}
      ref={composedRefs}
      value={field.value}
      {...props}
    >
      {props.label || props['aria-label']}
    </Checkbox>
  );
});

export { CheckboxInput };
