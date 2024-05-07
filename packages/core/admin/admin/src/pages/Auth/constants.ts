import type { ComponentType } from 'react';

import { ForgotPassword } from './components/ForgotPassword';
import { ForgotPasswordSuccess } from './components/ForgotPasswordSuccess';
import { Oops } from './components/Oops';
import { Register, RegisterProps } from './components/Register';
import { ResetPassword } from './components/ResetPassword';

export type AuthType =
  | 'login'
  | 'register'
  | 'register-admin'
  | 'forgot-password'
  | 'reset-password'
  | 'forgot-password-success'
  | 'oops'
  | 'providers';

export type FormDictionary = Record<AuthType, ComponentType | ComponentType<RegisterProps>>;

export const FORMS = {
  'forgot-password': ForgotPassword,
  'forgot-password-success': ForgotPasswordSuccess,
  // the `Component` attribute is set after all forms and CE/EE components are loaded, but since we
  // are here outside of a React component we can not use the hook directly
  login: () => null,
  oops: Oops,
  register: Register,
  'register-admin': Register,
  'reset-password': ResetPassword,
  providers: () => null,
} satisfies FormDictionary;

export const RTL_LOCALES = [
  'ar',
  'ar-AE',
  'ar-BH',
  'ar-DJ',
  'ar-DZ',
  'ar-EG',
  'ar-IQ',
  'ar-JO',
  'ar-KW',
  'ar-LB',
  'ar-LY',
  'ar-MA',
  'ar-OM',
  'ar-QA',
  'ar-SA',
  'ar-SD',
  'ar-SY',
  'ar-TN',
  'ar-YE',
  'fa-AF',
  'fa-IR',
  'he',
  'he-IL',
  'iw',
  'kd',
  'pk-PK',
  'ps',
  'ug',
  'ur',
  'ur-IN',
  'ur-PK',
  'yi',
  'yi-US',
];
