import { forwardRef, useState } from 'react';

import { Icon, TextInput } from '@strapi/design-system';
import { useFocusInputField } from '@strapi/helper-plugin';
import { Eye, EyeStriked } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useComposedRefs } from '../../content-manager/utils/refs';
import { useField } from '../Form';

import { InputProps } from './types';

export const PasswordInput = forwardRef<any, InputProps>(
  ({ disabled, label, hint, name, placeholder, required }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const { formatMessage } = useIntl();
    const field = useField(name);
    const fieldRef = useFocusInputField(name);

    const composedRefs = useComposedRefs(ref, fieldRef);

    return (
      <TextInput
        ref={composedRefs}
        autoComplete="password"
        disabled={disabled}
        error={field.error}
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
            {showPassword ? (
              <Icon as={Eye} color="neutral500" />
            ) : (
              <Icon as={EyeStriked} color="neutral500" />
            )}
          </button>
        }
        label={label}
        id={name}
        hint={hint}
        name={name}
        onChange={field.onChange}
        placeholder={placeholder}
        required={required}
        type={showPassword ? 'text' : 'password'}
        defaultValue={field.initialValue}
        value={field.value}
      />
    );
  }
);
