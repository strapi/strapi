import { forwardRef } from 'react';

import { TextInput, useComposedRefs } from '@strapi/design-system';
import { useFocusInputField } from '@strapi/helper-plugin';

import { useField } from '../Form';

import type { StringProps } from './types';

export const EmailInput = forwardRef<any, StringProps>((props, ref) => {
  const field = useField(props.name);
  const fieldRef = useFocusInputField(props.name);

  const composedRefs = useComposedRefs(ref, fieldRef);

  return (
    // @ts-expect-error – label _could_ be a ReactNode since it's a child, this should be fixed in the DS.
    <TextInput
      ref={composedRefs}
      autoComplete="email"
      error={field.error}
      id={props.name}
      onChange={field.onChange}
      defaultValue={field.initialValue}
      value={field.value}
      {...props}
      type="email"
    />
  );
});
