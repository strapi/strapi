import type { HasPermissionsConfig } from './policies';
import type * as ActionService from '../services/action';
import type { AdminTokenService, ContentApiTokenService } from '../services/api-token';
import type CEAuthService from '../services/auth';
import type * as ConditionService from '../services/condition';
import type * as ConstantsService from '../services/constants';
import type * as ContentTypeService from '../services/content-type';
import type EncryptionService from '../services/encryption';
import type { homepageService } from '../services/homepage';
import type CEMetricsService from '../services/metrics';
import type CEPassportService from '../services/passport';
import type * as PermissionService from '../services/permission';
import type * as ProjectSettingsService from '../services/project-settings';
import type CERoleService from '../services/role';
import type * as TokenService from '../services/token';
import type * as TransferService from '../services/transfer';
import type CEUserService from '../services/user';
import type EEAuthService from '../../../ee/server/src/services/auth';
import type EEMetricsService from '../../../ee/server/src/services/metrics';
import type EEPassportService from '../../../ee/server/src/services/passport';
import type EEPersistTablesService from '../../../ee/server/src/services/persist-tables';
import type EERoleService from '../../../ee/server/src/services/role';
import type EESeatEnforcementService from '../../../ee/server/src/services/seat-enforcement';
import type EEUserService from '../../../ee/server/src/services/user';

export type * as Policies from './policies';

/**
 * A service that the EE edition deep-merges over its CE implementation. CE code sees the CE members;
 * members only EE adds are optional because a CE runtime does not have them.
 */
type EditionService<TCE, TEE> = TCE & Partial<Omit<TEE, keyof TCE>>;

/**
 * The EE runtime shape of a service the EE edition deep-merges over its CE implementation: EE members
 * replace CE members with the same name. EE-only code paths pass it as an explicit generic, e.g.
 * `strapi.service<EnterpriseServices['role']>('admin::role')`.
 */
type EnterpriseService<TCE, TEE> = Omit<TCE, keyof TEE> & TEE;

/** EE runtime shapes of the admin services that the EE edition extends. */
export type EnterpriseServices = {
  auth: EnterpriseService<typeof CEAuthService, typeof EEAuthService>;
  metrics: EnterpriseService<typeof CEMetricsService, typeof EEMetricsService>;
  passport: EnterpriseService<typeof CEPassportService, typeof EEPassportService>;
  role: EnterpriseService<typeof CERoleService, typeof EERoleService>;
  user: EnterpriseService<typeof CEUserService, typeof EEUserService>;
};

/**
 * Default contracts loaded with the admin server types.
 * The EE edition deep-merges `auth`, `user`, `role`, `passport` and `metrics` over their CE
 * implementation: their contracts are the CE shape plus the EE-only members as optional.
 * `persist-tables` and `seat-enforcement` only exist in EE; their callers run in EE-only features.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageServices {
        'admin::action': typeof ActionService;
        /** @deprecated Use 'admin::api-token-content-api' instead */
        'admin::api-token': ContentApiTokenService;
        'admin::api-token-admin': AdminTokenService;
        'admin::api-token-content-api': ContentApiTokenService;
        'admin::auth': EditionService<typeof CEAuthService, typeof EEAuthService>;
        'admin::condition': typeof ConditionService;
        'admin::constants': typeof ConstantsService;
        'admin::content-type': typeof ContentTypeService;
        'admin::encryption': typeof EncryptionService;
        'admin::homepage': ReturnType<typeof homepageService>;
        'admin::metrics': EditionService<typeof CEMetricsService, typeof EEMetricsService>;
        'admin::passport': EditionService<typeof CEPassportService, typeof EEPassportService>;
        'admin::permission': typeof PermissionService;
        'admin::persist-tables': typeof EEPersistTablesService;
        'admin::project-settings': typeof ProjectSettingsService;
        'admin::role': EditionService<typeof CERoleService, typeof EERoleService>;
        'admin::seat-enforcement': typeof EESeatEnforcementService;
        'admin::token': typeof TokenService;
        'admin::transfer': typeof TransferService;
        'admin::user': EditionService<typeof CEUserService, typeof EEUserService>;
      }

      interface PackagePolicies {
        'admin::isAuthenticatedAdmin': undefined;
        'admin::hasPermissions': HasPermissionsConfig;
        'admin::isTelemetryEnabled': undefined;
      }
    }
  }
}
