import { forwardRef, useState } from 'react';

import {
  TextInput,
  useComposedRefs,
  Field,
  FieldLabel,
  FieldHint,
  FieldError,
} from '@strapi/design-system';
import { Eye, EyeStriked } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useFocusInputField } from '../../hooks/useFocusInputField';
import { useField } from '../Form';

import type { StringProps } from './types';

export const PasswordInput = forwardRef<HTMLInputElement, StringProps>(
  ({ name, required, label, hint, labelAction, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const { formatMessage } = useIntl();
    const field = useField(name);
    const fieldRef = useFocusInputField<HTMLInputElement>(name);

    const composedRefs = useComposedRefs(ref, fieldRef);

    return (
      <Field error={field.error} name={name} hint={hint} required={required}>
        <FieldLabel action={labelAction}>{label}</FieldLabel>
        <TextInput
          ref={composedRefs}
          autoComplete="password"
          endAction={
            <button
              aria-label={formatMessage({
                id: 'Auth.form.password.show-password',
                defaultMessage: 'Show password',
              })}
              onClick={() => {
                setShowPassword((prev) => !prev);
              }}
              style={{
                border: 'none',
                padding: 0,
                background: 'transparent',
              }}
              type="button"
            >
              {showPassword ? <Eye fill="neutral500" /> : <EyeStriked fill="neutral500" />}
            </button>
          }
          onChange={field.onChange}
          defaultValue={field.initialValue}
          value={field.value}
          {...props}
          type={showPassword ? 'text' : 'password'}
        />
        <FieldHint />
        <FieldError />
      </Field>
    );
  }
);
