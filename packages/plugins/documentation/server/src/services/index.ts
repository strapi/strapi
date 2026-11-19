import type { Core } from '@strapi/types';
import type {} from '../types';

// import type { Common } from '@strapi/types';

import documentation, { type DocumentationService } from './documentation';
import override, { type OverrideService } from './override';

/** Names of the registered Documentation services. */
type RegisteredNames = keyof Core.RegisteredFor<
  Strapi.Registries.PackageServices,
  'plugin::documentation'
>;

export default {
  documentation,
  override,
} satisfies Record<RegisteredNames, unknown>;

export type Services = {
  documentation: DocumentationService;
  override: OverrideService;
};
