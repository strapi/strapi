import type { HasPermissionsConfig } from './policies';

export type * as Policies from './policies';

/** Default contracts loaded with the Content Manager server types. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface DefaultPolicies {
        'plugin::content-manager.hasPermissions': HasPermissionsConfig | undefined;
      }
    }
  }
}
