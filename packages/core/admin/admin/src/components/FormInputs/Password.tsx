import * as React from 'react';

import { useQueryParams } from '@strapi/admin/strapi-admin';
import { TextInput, useComposedRefs, Field } from '@strapi/design-system';
import { Eye, EyeStriked } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import type { StringProps } from './types';

const PasswordInput = React.forwardRef<HTMLInputElement, StringProps>(
  ({ name, required, label, hint, labelAction, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const { formatMessage } = useIntl();
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
          key={`inputPassword-${name}-${localeKey}`}
          ref={composedRefs}
          autoComplete="password"
          endAction={
            <Field.Action
              label={formatMessage({
                id: 'Auth.form.password.show-password',
                defaultMessage: 'Show password',
              })}
              onClick={() => {
                setShowPassword((prev) => !prev);
              }}
            >
              {showPassword ? <Eye fill="neutral500" /> : <EyeStriked fill="neutral500" />}
            </Field.Action>
          }
          onChange={field.onChange}
          value={field.value}
          {...props}
          type={showPassword ? 'text' : 'password'}
        />
        <Field.Hint />
        <Field.Error />
      </Field.Root>
    );
  }
);

const MemoizedPasswordInput = React.memo(PasswordInput);

export { MemoizedPasswordInput as PasswordInput };
