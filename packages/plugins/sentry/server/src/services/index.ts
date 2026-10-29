import type { Core } from '@strapi/types';
import type {} from '../types';

import sentry from './sentry';

/** Names of the registered Sentry services. */
type RegisteredNames = keyof Core.RegisteredFor<
  Strapi.Registries.PackageServices,
  'plugin::sentry'
>;

export default {
  sentry,
} satisfies Record<RegisteredNames, unknown>;
