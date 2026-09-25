import type { HasPermissionsConfig } from './policies';
import type * as PermissionService from '../services/permission';
import type * as TransferService from '../services/transfer';

export type * as Policies from './policies';

/**
 * Default contracts loaded with the admin server types.
 * Services that the EE edition replaces (`auth`, `user`, `role`, `passport`, `metrics`) are not
 * registered: their CE and EE shapes differ.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageServices {
        'admin::permission': typeof PermissionService;
        'admin::transfer': typeof TransferService;
      }

      interface PackagePolicies {
        'admin::isAuthenticatedAdmin': undefined;
        'admin::hasPermissions': HasPermissionsConfig;
        'admin::isTelemetryEnabled': undefined;
      }
    }
  }
}
