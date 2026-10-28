import type { Controllers } from './controllers';
import type { HasPermissionsConfig } from './policies';
import type { RateLimitOptions } from './rate-limit';
import type * as ActionService from '../services/action';
import type { AdminTokenService, ContentApiTokenService } from '../services/api-token';
import type CEAuthService from '../services/auth';
import type * as ConditionService from '../services/condition';
import type * as ConstantsService from '../services/constants';
import type * as ContentTypeService from '../services/content-type';
import type DebugDumpService from '../services/debug-dump';
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
import type { AdminRoleWithUsersCount } from '../services/role';
import type EERoleService from '../../../ee/server/src/services/role';
import type EESeatEnforcementService from '../../../ee/server/src/services/seat-enforcement';
import type EEUserService from '../../../ee/server/src/services/user';
import type { PersistedTable } from '../../../ee/server/src/services/persist-tables';
import type { AdminRole, Permission, SanitizedAdminUser } from '../../../shared/contracts/shared';
import type { AutoRegistrationEvent } from '../audit-logs/auth';
import type { HomepageLayout } from '../controllers/validation/schema';

export type * as Controllers from './controllers';
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
 * The `admin::role` service as runtime calls it: `findOne`, `findOneWithUsersCount`,
 * `getSuperAdmin` and `getSuperAdminWithUsersCount` resolve to `null` when no role matches, the
 * result of the query engine's `findOne` (`services/role.ts:87-107`, `:228-233`). The implementation
 * keeps develop's published `Promise<AdminRole>`, `Promise<AdminRoleWithUsersCount>` and
 * `Promise<AdminRole | undefined>`.
 */
type RoleService<TService extends { findOne: (...args: never[]) => unknown }> = Omit<
  TService,
  'findOne' | 'findOneWithUsersCount' | 'getSuperAdmin' | 'getSuperAdminWithUsersCount'
> & {
  findOne(...args: Parameters<(typeof CERoleService)['findOne']>): Promise<AdminRole | null>;
  findOneWithUsersCount(
    ...args: Parameters<(typeof CERoleService)['findOneWithUsersCount']>
  ): Promise<AdminRoleWithUsersCount | null>;
  getSuperAdmin(): Promise<AdminRole | null>;
  getSuperAdminWithUsersCount(): Promise<AdminRoleWithUsersCount | null>;
};

/**
 * What an action provider receives in the registered contract. Settings actions have a category,
 * other sections may leave it out or pass `undefined`, also under `exactOptionalPropertyTypes`.
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
  role: RoleService<EnterpriseService<typeof CERoleService, typeof EERoleService>>;
  user: EnterpriseService<typeof CEUserService, typeof EEUserService>;
};

/**
 * The admin authentication settings, stored under `core_admin_auth`. The admin bootstrap merges the
 * defaults over the stored value at every start, so `providers` is always set. The EE SSO settings
 * endpoint replaces `providers` with the validated body, which may leave out the optional members.
 */
type AdminAuthStore = {
  providers: {
    autoRegister: boolean;
    /** The role of auto-registered SSO users. Reset to `null` at start when the role is deleted. */
    defaultRole?: string | number | null;
    /** The IDs of the roles SSO users cannot leave, as strings or numbers. */
    ssoLockedRoles?: Array<string | number> | null;
  };
};

/** A logo of the project settings: the members of the uploaded file the admin keeps. */
type ProjectSettingsLogo = {
  name?: string;
  hash?: string;
  url?: string;
  width?: number;
  height?: number;
  ext?: string;
  size?: number;
  provider?: unknown;
};

/**
 * The project settings, stored under `core_admin_project-settings`. A logo is missing until it is
 * first uploaded, and `null` once removed.
 */
type ProjectSettingsStore = {
  menuLogo?: ProjectSettingsLogo | null;
  authLogo?: ProjectSettingsLogo | null;
};

/**
 * A user disabled by EE seat enforcement, stored under `ee_disabled_users`: the user's ID and its
 * active state before it was disabled.
 */
type DisabledUserStore = { id: string | number; isActive: boolean };

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
        /**
         * Builds the support snapshot served by `GET /admin/debug-dump`. Loaded in CE and EE, like
         * every service of the admin service map.
         */
        'admin::debug-dump': ReturnType<typeof DebugDumpService>;
        'admin::encryption': typeof EncryptionService;
        'admin::homepage': ReturnType<typeof homepageService>;
        'admin::metrics': EditionService<typeof CEMetricsService, typeof EEMetricsService>;
        'admin::passport': EditionService<typeof CEPassportService, typeof EEPassportService>;
        'admin::permission': PermissionServiceContract;
        'admin::persist-tables': typeof EEPersistTablesService | undefined;
        'admin::project-settings': typeof ProjectSettingsService;
        'admin::role': RoleService<EditionService<typeof CERoleService, typeof EERoleService>>;
        'admin::seat-enforcement': typeof EESeatEnforcementService | undefined;
        'admin::token': typeof TokenService;
        'admin::transfer': typeof TransferService;
        'admin::user': EditionService<typeof CEUserService, typeof EEUserService>;
      }

      /**
       * Core store rows the admin writes and reads. `ee_disabled_users` and `core_persisted_tables`
       * are only written by the EE edition: a CE runtime has no row, so they read `null`.
       * `core_persisted_tables` is also read by `@strapi/database` to keep the listed tables.
       */
      interface Stores {
        core_admin_auth: AdminAuthStore;
        'core_admin_project-settings': ProjectSettingsStore;
        /** One homepage layout per admin user, keyed by user ID. */
        [key: `core_admin_homepage-layout:${string}`]: HomepageLayout;
        core_persisted_tables: Array<string | PersistedTable>;
        ee_disabled_users: DisabledUserStore[];
      }

      /**
       * Events the admin emits on the event hub, with the payload of each producer (CE and EE).
       * The audit log events (`admin-user.*`, `token.*`, `webhook.*`, `admin.auth.error`) are emitted
       * through `emitAudit`, which takes any payload, so they are not registered.
       */
      interface Events {
        /** @deprecated Removed in the next major, see `LEGACY_USER_EVENTS`. */
        'user.create': [{ user: SanitizedAdminUser }];
        /** @deprecated Removed in the next major, see `LEGACY_USER_EVENTS`. */
        'user.update': [{ user: SanitizedAdminUser }];
        /**
         * One user for a single delete, the list for a bulk delete: listeners narrow it with
         * `'users' in payload`.
         * @deprecated Removed in the next major, see `LEGACY_USER_EVENTS`.
         */
        'user.delete': [{ user: SanitizedAdminUser } | { users: SanitizedAdminUser[] }];
        'role.create': [{ role: Omit<AdminRole, 'users' | 'permissions'> }];
        'role.update': [{ role: Omit<AdminRole, 'users' | 'permissions'> }];
        /** The deleted `admin::role` row. */
        'role.delete': [{ role: AdminRole }];
        'permission.create': [{ permissions: Permission[] }];
        /** The updated permission, a single one despite the name. */
        'permission.update': [{ permissions: Permission }];
        /** The deleted `admin::permission` rows, `null` for an ID that matched nothing. */
        'permission.delete': [{ permissions: unknown[] }];
        /** `provider` is `'local'` for a password login, else the SSO provider. */
        'admin.auth.success': [{ user: SanitizedAdminUser; provider: string }];
        'admin.logout': [{ user: SanitizedAdminUser }];
        /** EE only: an SSO login created the user. */
        'admin.auth.autoRegistration': [AutoRegistrationEvent];
        /** EE only: a new audit log export, with the filters of its query. */
        'audit-log.export': [{ filters: unknown }];
      }

      /**
       * The CE controllers (`controllers/index.ts`). The EE edition merges its own actions over
       * `admin`, `authentication`, `role` and `user` (`ee/server/src/controllers/index.ts`).
       */
      interface PackageControllers {
        'admin::admin': Controllers['admin'];
        'admin::admin-token': Controllers['admin-token'];
        'admin::ai': Controllers['ai'];
        'admin::api-token': Controllers['api-token'];
        'admin::authenticated-session': Controllers['authenticated-session'];
        'admin::authenticated-user': Controllers['authenticated-user'];
        'admin::authentication': Controllers['authentication'];
        'admin::content-api': Controllers['content-api'];
        'admin::homepage': Controllers['homepage'];
        'admin::permission': Controllers['permission'];
        'admin::role': Controllers['role'];
        'admin::transfer': Controllers['transfer'];
        'admin::user': Controllers['user'];
        'admin::webhooks': Controllers['webhooks'];
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
