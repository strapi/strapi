import type { ComponentType } from 'react';

import { Providers } from './components/Providers';

type AuthType = 'providers';

type FormDictionary = Record<AuthType, ComponentType>;

export const FORMS = {
  providers: Providers,
} satisfies FormDictionary;
