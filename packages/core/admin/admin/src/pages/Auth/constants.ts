import type { ComponentType } from 'react';

import { ForgotPassword } from './components/ForgotPassword';
import { ForgotPasswordSuccess } from './components/ForgotPasswordSuccess';
import { Oops } from './components/Oops';
import { Register, RegisterProps } from './components/Register';
import { ResetPassword } from './components/ResetPassword';

export const AUTH_TYPES = {
  LOGIN: 'login',
  REGISTER: 'register',
  REGISTER_ADMIN: 'register-admin',
  FORGOT_PASSWORD: 'forgot-password',
  RESET_PASSWORD: 'reset-password',
  FORGOT_PASSWORD_SUCCESS: 'forgot-password-success',
  OOPS: 'oops',
  PROVIDERS: 'providers',
} as const;

export type AuthType = (typeof AUTH_TYPES)[keyof typeof AUTH_TYPES];

const AUTH_TYPE_VALUES: readonly string[] = Object.values(AUTH_TYPES);

/**
 * Narrows the `:authType` route param, which is an arbitrary string, to a known auth type.
 */
export const isAuthType = (value: string | undefined): value is AuthType =>
  value !== undefined && AUTH_TYPE_VALUES.includes(value);

export type FormDictionary = Record<AuthType, ComponentType | ComponentType<RegisterProps>>;

export const FORMS = {
  [AUTH_TYPES.FORGOT_PASSWORD]: ForgotPassword,
  [AUTH_TYPES.FORGOT_PASSWORD_SUCCESS]: ForgotPasswordSuccess,
  // the `Component` attribute is set after all forms and CE/EE components are loaded, but since we
  // are here outside of a React component we can not use the hook directly
  [AUTH_TYPES.LOGIN]: () => null,
  [AUTH_TYPES.OOPS]: Oops,
  [AUTH_TYPES.REGISTER]: Register,
  [AUTH_TYPES.REGISTER_ADMIN]: Register,
  [AUTH_TYPES.RESET_PASSWORD]: ResetPassword,
  [AUTH_TYPES.PROVIDERS]: () => null,
} satisfies FormDictionary;
