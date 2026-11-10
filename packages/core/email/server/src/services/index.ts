import type { Core } from '@strapi/types';
import type {} from '../types';

import email from './email';

/** Names of the registered Email services. */
type RegisteredNames = keyof Core.RegisteredFor<Strapi.Registries.PackageServices, 'plugin::email'>;

export const services = { email } satisfies Record<RegisteredNames, unknown>;
