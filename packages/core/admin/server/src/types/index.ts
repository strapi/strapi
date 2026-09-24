import type { HasPermissionsConfig } from './policies';

export type * as Policies from './policies';

/** Default contracts loaded with the admin server types. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface DefaultPolicies {
        'admin::isAuthenticatedAdmin': undefined;
        'admin::hasPermissions': HasPermissionsConfig;
        'admin::isTelemetryEnabled': undefined;
      }
    }
  }
}
