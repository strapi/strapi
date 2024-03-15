import { forwardRef, useState } from 'react';

import { Icon, TextInput, useComposedRefs } from '@strapi/design-system';
import { useFocusInputField } from '@strapi/helper-plugin';
import { Eye, EyeStriked } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useField } from '../Form';

import type { StringProps } from './types';

export const PasswordInput = forwardRef<any, StringProps>((props, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const { formatMessage } = useIntl();
  const field = useField(props.name);
  const fieldRef = useFocusInputField(props.name);

  const composedRefs = useComposedRefs(ref, fieldRef);

  return (
    // @ts-expect-error – label _could_ be a ReactNode since it's a child, this should be fixed in the DS.
    <TextInput
      ref={composedRefs}
      autoComplete="password"
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
      id={props.name}
      onChange={field.onChange}
      defaultValue={field.initialValue}
      value={field.value}
      {...props}
      type={showPassword ? 'text' : 'password'}
    />
  );
});
