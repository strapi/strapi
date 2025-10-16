import * as React from 'react';

import { useQueryParams } from '@strapi/admin/strapi-admin';
import { TextInput, useComposedRefs, Field } from '@strapi/design-system';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import type { StringProps } from './types';

const EmailInput = React.forwardRef<HTMLInputElement, StringProps>(
  ({ name, required, label, hint, labelAction, ...props }, ref) => {
    const field = useField(name);
    const fieldRef = useFocusInputField<HTMLInputElement>(name);
    const [{ query }] = useQueryParams<{ plugins?: { i18n?: { locale?: string } } }>();

    const composedRefs = useComposedRefs(ref, fieldRef);

    // Create a key that changes when locale changes to force re-render
    const localeKey = query?.plugins?.i18n?.locale || 'default';

    return (
      <Field.Root error={field.error} name={name} hint={hint} required={required}>
        <Field.Label action={labelAction}>{label}</Field.Label>
        <TextInput
          key={`inputEmail-${name}-${localeKey}`}
          ref={composedRefs}
          autoComplete="email"
          onChange={field.onChange}
          value={field.value}
          {...props}
          type="email"
        />
        <Field.Hint />
        <Field.Error />
      </Field.Root>
    );
  }
);

const MemoizedEmailInput = React.memo(EmailInput);

export { MemoizedEmailInput as EmailInput };
