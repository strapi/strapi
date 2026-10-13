import type { HasPermissionsConfig } from './policies';
import type { RateLimitOptions } from './rate-limit';
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
import type { Action, CreateActionPayload } from '../domain/action';
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
export type { RateLimitOptions } from './rate-limit';

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

/**
 * What an action provider receives in the registered contract. Settings actions have a category,
 * other sections may leave it out or pass `undefined`, also under `exactOptionalPropertyTypes`.
 * TODO @Nico The published `CreateActionPayload` and `Action` keep develop's required
 * `category: string`, although actions registered without one hold `undefined`: widening them
 * changes types applications see without strict types, so it waits for a major.
 */
type ActionProviderInput = Omit<CreateActionPayload, 'category'> & {
  category?: string | undefined;
};

type ActionProvider = (typeof PermissionService)['actionProvider'];
type PermissionsManager = ReturnType<(typeof PermissionService)['createPermissionsManager']>;
type SectionsBuilder = (typeof PermissionService)['sectionsBuilder'];

/**
 * The `admin::permission` service as runtime calls it. The implementation keeps its published
 * develop signatures: the action provider requires a category, permission queries take two
 * arguments, and section hooks receive no arguments.
 */
type PermissionServiceContract = Omit<
  typeof PermissionService,
  'actionProvider' | 'createPermissionsManager' | 'sectionsBuilder'
> & {
  createPermissionsManager(
    ...args: Parameters<(typeof PermissionService)['createPermissionsManager']>
  ): Omit<PermissionsManager, 'addPermissionsQueryTo'> & {
    /** The query defaults to `{}`, the action to the manager's action. */
    addPermissionsQueryTo(
      query?: object,
      action?: unknown
    ): ReturnType<PermissionsManager['addPermissionsQueryTo']>;
  };
  sectionsBuilder: Omit<SectionsBuilder, 'addHandler' | 'addMatcher'> & {
    addHandler(
      sectionName: string,
      handler: (context: { action: Action; section: unknown }) => unknown
    ): ReturnType<SectionsBuilder['addHandler']>;
    addMatcher(
      sectionName: string,
      matcher: (action: Action) => unknown
    ): ReturnType<SectionsBuilder['addMatcher']>;
  };
  actionProvider: Omit<ActionProvider, 'register' | 'registerMany'> & {
    register(actionAttributes: ActionProviderInput): ReturnType<ActionProvider['register']>;
    registerMany(
      actionsAttributes: ActionProviderInput[]
    ): ReturnType<ActionProvider['registerMany']>;
  };
};

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
 * `persist-tables` and `seat-enforcement` only exist in EE, so a CE runtime resolves them to
 * `undefined`. EE-only features read them through helpers that drop `undefined`.
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
        'admin::permission': PermissionServiceContract;
        'admin::persist-tables': typeof EEPersistTablesService | undefined;
        'admin::project-settings': typeof ProjectSettingsService;
        'admin::role': EditionService<typeof CERoleService, typeof EERoleService>;
        'admin::seat-enforcement': typeof EESeatEnforcementService | undefined;
        'admin::token': typeof TokenService;
        'admin::transfer': typeof TransferService;
        'admin::user': EditionService<typeof CEUserService, typeof EEUserService>;
      }

      interface PackagePolicies {
        'admin::isAuthenticatedAdmin': undefined;
        'admin::hasPermissions': HasPermissionsConfig;
        'admin::isTelemetryEnabled': undefined;
      }

      interface PackageMiddlewares {
        // Spread over the options read from `admin.rateLimit`.
        'admin::rateLimit': RateLimitOptions | undefined;
        'admin::data-transfer': undefined;
      }
    }
  }
}
