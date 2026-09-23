import type { HasPermissionsConfig } from './types/policies';

/** Import this module from an application declaration file to opt in to stricter Content Manager types. */
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
