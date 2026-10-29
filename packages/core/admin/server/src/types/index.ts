import type { Core } from '@strapi/types';
import type { Controllers } from './controllers';
import type { Controllers as EEControllers } from '../../../ee/server/src/types/controllers';
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
 * A service that the EE edition deep-merges over its CE implementation when a license verifies at
 * boot. Its contract follows the program's license scope: the EE shape in an application that lists
 * a licensed feature, the CE shape in one that lists none, and the CE shape with the EE-only members
 * optional in any other program, such as this package's.
 */
type EditionService<TCE, TEE> = Core.LicensedExtension<TCE, TEE>;

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

/**
 * An action to register, as `as const` arrays and inline literals type it: arrays may be readonly.
 * Same fields as {@link ActionProviderInput}.
 */
type ActionRegistration = Readonly<
  Omit<ActionProviderInput, 'subjects' | 'options' | 'aliases'>
> & {
  readonly subjects?: readonly string[] | undefined;
  readonly options?: { readonly applyToProperties: readonly string[] | null } | undefined;
  readonly aliases?:
    | readonly { readonly actionId: string; readonly subjects?: readonly string[] | undefined }[]
    | undefined;
};

/**
 * The action provider with strict types. `register` and `registerMany` check that each action's
 * computed ID is a registered permission action (`Core.PermissionActionCheck`); reads accept any
 * runtime ID and reject an unregistered literal (`Core.PermissionActionLookup`). Without strict
 * types, the contract keeps the implementation's signatures.
 */
type StrictActionProvider = Omit<
  ActionProvider,
  'register' | 'registerMany' | 'get' | 'has' | 'appliesToProperty' | 'unstable_aliases'
> & {
  register<const TAction extends ActionRegistration>(
    actionAttributes: Core.PermissionActionCheck<TAction>
  ): ReturnType<ActionProvider['register']>;
  registerMany<const TActions extends readonly ActionRegistration[]>(actionsAttributes: {
    [TIndex in keyof TActions]: Core.PermissionActionCheck<TActions[TIndex]>;
  }): ReturnType<ActionProvider['registerMany']>;
  get<TId extends Core.PermissionActionLookupName>(
    actionId: Core.PermissionActionLookup<TId>
  ): ReturnType<ActionProvider['get']>;
  has<TId extends Core.PermissionActionLookupName>(
    actionId: Core.PermissionActionLookup<TId>
  ): ReturnType<ActionProvider['has']>;
  appliesToProperty<TId extends Core.PermissionActionLookupName>(
    property: string,
    actionId: Core.PermissionActionLookup<TId>,
    subject: Parameters<ActionProvider['appliesToProperty']>[2]
  ): ReturnType<ActionProvider['appliesToProperty']>;
  unstable_aliases<TId extends Core.PermissionActionLookupName>(
    actionId: Core.PermissionActionLookup<TId>,
    subject?: string | null
  ): ReturnType<ActionProvider['unstable_aliases']>;
};
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
  actionProvider: Core.IsStrict extends true
    ? StrictActionProvider
    : Omit<ActionProvider, 'register' | 'registerMany'> & {
        register(actionAttributes: ActionProviderInput): ReturnType<ActionProvider['register']>;
        registerMany(
          actionsAttributes: ActionProviderInput[]
        ): ReturnType<ActionProvider['registerMany']>;
      };
};

/**
 * EE runtime shapes of the admin services that the EE edition extends. EE code runs only with the
 * EE edition merged, so it passes them whatever the program's license scope.
 */
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
 * When a license verifies at boot, the EE edition deep-merges `auth`, `user`, `role`, `passport` and
 * `metrics` over their CE implementation (`Core.LicensedExtension`) and adds `persist-tables` and
 * `seat-enforcement` (`Core.Licensed<'licensed', …>`). An application with type generation lists
 * its license in `licensedFeatures`: any listed feature gives the EE contracts, none gives the CE
 * contracts and `undefined` for the EE-only services. Other programs get the CE contracts with the
 * EE-only members optional, and the EE-only services may be `undefined`. EE code reads them through
 * helpers that assume the EE edition.
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
        'admin::persist-tables': Core.Licensed<'licensed', typeof EEPersistTablesService>;
        'admin::project-settings': typeof ProjectSettingsService;
        'admin::role': RoleService<EditionService<typeof CERoleService, typeof EERoleService>>;
        'admin::seat-enforcement': Core.Licensed<'licensed', typeof EESeatEnforcementService>;
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
       * The CE controllers (`controllers/index.ts`). When a license verifies at boot, the EE edition
       * merges its actions over `admin`, `authentication`, `role` and `user`
       * (`ee/server/src/controllers/index.ts`, `Core.LicensedExtension`), like the services it
       * extends.
       */
      interface PackageControllers {
        'admin::admin': Core.LicensedExtension<Controllers['admin'], EEControllers['admin']>;
        'admin::admin-token': Controllers['admin-token'];
        'admin::ai': Controllers['ai'];
        'admin::api-token': Controllers['api-token'];
        /**
         * Added by the EE edition when the license that verifies at boot lists `audit-logs`. Also
         * absent when `admin.auditLogs.enabled` is `false`, which the types do not model.
         */
        'admin::audit-logs': Core.Licensed<'audit-logs', EEControllers['audit-logs']>;
        'admin::authenticated-session': Controllers['authenticated-session'];
        'admin::authenticated-user': Controllers['authenticated-user'];
        'admin::authentication': Core.LicensedExtension<
          Controllers['authentication'],
          EEControllers['authentication']
        >;
        'admin::content-api': Controllers['content-api'];
        'admin::homepage': Controllers['homepage'];
        'admin::permission': Controllers['permission'];
        'admin::role': Core.LicensedExtension<Controllers['role'], EEControllers['role']>;
        'admin::transfer': Controllers['transfer'];
        'admin::user': Core.LicensedExtension<Controllers['user'], EEControllers['user']>;
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

      /**
       * The CE actions, registered at bootstrap (`config/admin-actions.ts`), and the EE actions
       * (`ee/server/src/config/admin-actions.ts`), registered only when their EE feature is enabled.
       */
      interface PermissionActions {
        'admin::marketplace.read': true;
        'admin::webhooks.create': true;
        'admin::webhooks.read': true;
        'admin::webhooks.update': true;
        'admin::webhooks.delete': true;
        'admin::users.create': true;
        'admin::users.read': true;
        'admin::users.update': true;
        'admin::users.delete': true;
        'admin::roles.create': true;
        'admin::roles.read': true;
        'admin::roles.update': true;
        'admin::roles.delete': true;
        'admin::api-tokens.access': true;
        'admin::admin-tokens.access': true;
        'admin::admin-tokens.create': true;
        'admin::admin-tokens.read': true;
        'admin::admin-tokens.update': true;
        'admin::admin-tokens.regenerate': true;
        'admin::admin-tokens.delete': true;
        'admin::api-tokens.create': true;
        'admin::api-tokens.read': true;
        'admin::api-tokens.update': true;
        'admin::api-tokens.regenerate': true;
        'admin::api-tokens.delete': true;
        'admin::project-settings.update': true;
        'admin::project-settings.read': true;
        'admin::debug-dump.read': true;
        'admin::transfer.tokens.access': true;
        'admin::transfer.tokens.create': true;
        'admin::transfer.tokens.read': true;
        'admin::transfer.tokens.update': true;
        'admin::transfer.tokens.regenerate': true;
        'admin::transfer.tokens.delete': true;
        /** EE: registered only when the `sso` feature is enabled. */
        'admin::provider-login.read': true;
        /** EE: registered only when the `sso` feature is enabled. */
        'admin::provider-login.update': true;
        /**
         * EE: registered only when the `audit-logs` feature is enabled. A planned fix will also
         * require `admin.auditLogs.enabled`, as the audit logs routes already do.
         */
        'admin::audit-logs.read': true;
        /**
         * EE: registered only when the `audit-logs` feature is enabled. A planned fix will also
         * require `admin.auditLogs.enabled`, as the audit logs routes already do.
         */
        'admin::audit-logs.export': true;
      }
    }
  }
}
