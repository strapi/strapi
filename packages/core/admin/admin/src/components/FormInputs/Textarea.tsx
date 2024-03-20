import { forwardRef } from 'react';

import { Textarea, useComposedRefs } from '@strapi/design-system';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import type { StringProps } from './types';

export const TextareaInput = forwardRef<any, StringProps>((props, ref) => {
  const field = useField(props.name);
  const fieldRef = useFocusInputField(props.name);

  const composedRefs = useComposedRefs(ref, fieldRef);

  return (
    // @ts-expect-error – label _could_ be a ReactNode since it's a child, this should be fixed in the DS.
    <Textarea
      ref={composedRefs}
      defaultValue={field.initialValue}
      error={field.error}
      id={props.name}
      onChange={field.onChange}
      value={field.value ?? ''}
      {...props}
    />
  );
});
