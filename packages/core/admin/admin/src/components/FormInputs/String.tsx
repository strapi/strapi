import { forwardRef } from 'react';

import { TextInput, useComposedRefs } from '@strapi/design-system';
import { useFocusInputField } from '@strapi/helper-plugin';

import { type InputProps, useField } from '../Form';

/**
 * TODO: fix the ref type when the design system is fixed.
 */
export const StringInput = forwardRef<any, InputProps>(({ ...props }, ref) => {
  const field = useField(props.name);
  const fieldRef = useFocusInputField(props.name);

  const composedRefs = useComposedRefs(ref, fieldRef);

  return (
    // @ts-expect-error – label _could_ be a ReactNode since it's a child, this should be fixed in the DS.
    <TextInput
      ref={composedRefs}
      error={field.error}
      defaultValue={field.initialValue}
      onChange={field.onChange}
      value={field.value ?? ''}
      {...props}
    />
  );
});
