import { forwardRef } from 'react';

import { JSONInput as JSONInputImpl, useComposedRefs } from '@strapi/design-system';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import { InputProps } from './types';

/**
 * TODO: fix the ref type when the design system is fixed.
 */
export const JsonInput = forwardRef<any, InputProps>((props, ref) => {
  const field = useField(props.name);
  const fieldRef = useFocusInputField(props.name);

  const composedRefs = useComposedRefs(ref, fieldRef);

  return (
    // @ts-expect-error – label _could_ be a ReactNode since it's a child, this should be fixed in the DS.
    <JSONInputImpl
      ref={composedRefs}
      value={field.value}
      error={field.error}
      onChange={(json) => {
        // Default to null when the field is not required and there is no input value
        const value = props.required && !json.length ? null : json;
        field.onChange(props.name, value);
      }}
      minHeight={`25.2rem`}
      maxHeight={`50.4rem`}
      {...props}
    />
  );
});
