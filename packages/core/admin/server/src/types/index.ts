import type { Ability, ForcedSubject } from '@casl/ability';
import type { Core, Data, Modules, UID } from '@strapi/types';
import type { engine as PermissionsEngine } from '@strapi/permissions';
import type { hooks as HooksUtils } from '@strapi/utils';
import type { Controllers } from './controllers';
import type { Controllers as EEControllers } from '../../../ee/server/src/types/controllers';
import type { HasPermissionsConfig } from './policies';
import type { RateLimitOptions } from './rate-limit';
import type * as ActionService from '../services/action';
import type { AdminTokenService, ContentApiTokenService } from '../services/api-token';
import type { AdminApiToken } from '../../../shared/contracts/admin-token';
import type { ContentApiApiToken } from '../../../shared/contracts/content-api-token';
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
import type {
  AdminRole,
  AdminUser,
  Permission,
  SanitizedAdminUser,
} from '../../../shared/contracts/shared';
import type { AutoRegistrationEvent } from '../audit-logs/auth';
import type { HomepageLayout } from '../controllers/validation/schema';
import type {
  ContentPermission,
  PluginPermission,
  SettingPermission,
} from '../../../shared/contracts/permissions';

export type * as Controllers from './controllers';
export type * as Policies from './policies';
export type { RateLimitOptions } from './rate-limit';
// Also exported by `@strapi/admin/strapi-admin`, which loads the admin panel and its UI libraries.
export type { AdminUser, Permission, SanitizedAdminUser };

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

/** A call that populates no relation. */
type NoPopulate = Record<never, never>;

/**
 * A row of the admin content type `TUID` as the query engine returns it, read with the `populate` of
 * the call: the strict result model of the Document Service (`Modules.Documents.StrictResult`) on
 * the schema the admin declares (`./content-types.ts`), as `strapi.documents(uid)` reads it. Every
 * column is present and may be `null`, a required one included: the database does not enforce
 * `required`. Only the populated relations are present. `TPopulate` is `undefined` when the call
 * populates nothing.
 */
type AdminRow<TUID extends UID.ContentType, TPopulate = undefined> = Modules.Documents.StrictResult<
  TUID,
  [TPopulate] extends [undefined] ? NoPopulate : { populate: TPopulate },
  'published'
>;

/** The `populate` of a read of `TUID`: the notations of the Document Service. */
type AdminPopulate<TUID extends UID.ContentType> = Modules.Documents.Params.Populate.Any<TUID>;

/** The `populate` in the query params of a read, when it is one the types can read. */
type PopulateOfParams<TUID extends UID.ContentType, TParams> = TParams extends {
  populate: infer TPopulate extends AdminPopulate<TUID>;
}
  ? TPopulate
  : undefined;

/** An `admin::role` row, with the relations `TPopulate` populates. */
type RoleRow<TPopulate = undefined> = AdminRow<'admin::role', TPopulate>;

/** An `admin::role` row with the count of its users (`services/role.ts`, `getUsersCount`). */
type RoleRowWithUsersCount<TPopulate = undefined> = RoleRow<TPopulate> & { usersCount: number };

/**
 * An `admin::user` row, with the relations `TPopulate` populates. The default `populate` of the user
 * service reads (`['roles']`) gives each role as its row.
 */
type UserRow<TPopulate = undefined> = AdminRow<'admin::user', TPopulate>;

/** An `admin::user` row with its roles, as the user service writes and reads it by default. */
type UserRowWithRoles = UserRow<['roles']>;

/**
 * A user passed to an admin service: develop's `AdminUser`, such as `ctx.state.user`, or a row the
 * user service returns, with or without its roles.
 */
type UserInput = AdminUser | UserRow | UserRowWithRoles;

/**
 * An `admin::permission` as the permission queries return it (`domain/permission`, `toPermission`):
 * the `id`, `action` and `subject` columns, and the JSON columns with the defaults and shapes of the
 * permission domain. The timestamps are not kept.
 */
type PermissionRow = Pick<AdminRow<'admin::permission'>, 'id' | 'action' | 'subject'> &
  Pick<Permission, 'actionParameters' | 'properties' | 'conditions'>;

/** The fields `sanitizeUser` removes (`services/user.ts`). */
type PrivateUserField =
  'password' | 'resetPasswordToken' | 'resetPasswordTokenExpiresAt' | 'registrationToken';

/** The roles of a sanitized user: each with its `id`, `name`, `description` and `code` only. */
type SanitizedRoles<TRoles> = TRoles extends readonly (infer TRole)[]
  ? Array<Pick<TRole, Extract<keyof TRole, 'id' | 'name' | 'description' | 'code'>>>
  : undefined;

/**
 * `TUser` as `sanitizeUser` returns it: without its private fields, and with its roles sanitized when
 * it has them. A user read without its roles keeps `roles` undefined: the implementation maps them
 * only when they are set.
 */
type SanitizedUser<TUser> = Omit<TUser, PrivateUserField | 'roles'> & {
  roles: TUser extends { roles?: infer TRoles } ? SanitizedRoles<TRoles> : undefined;
};

/** An `admin::api-token` row. */
type ApiTokenRow = AdminRow<'admin::api-token'>;

/**
 * A token as the token services return it (`services/api-token.ts`): the shape of `TToken`, with
 * `expiresAt` read from its column, `null` for a token without a lifespan.
 */
type TokenResult<TToken> = TToken extends unknown
  ? Omit<TToken, 'expiresAt'> & { expiresAt: ApiTokenRow['expiresAt'] }
  : never;

/**
 * A regenerated token: the `id`, `name` and `kind` columns `regenerate` selects, and the new access
 * key in clear, the only time it is returned.
 */
type RegeneratedToken<TToken extends { kind: string }> = Pick<ApiTokenRow, 'id' | 'name'> & {
  kind: TToken['kind'];
  accessKey: string;
};

type TokenServiceOverride =
  | 'create'
  | 'list'
  | 'getById'
  | 'getByName'
  | 'getByAccessKey'
  | 'update'
  | 'revoke'
  | 'regenerate';

/**
 * The token reads and writes with strict types, for the token type of the service: the results of
 * `tests/api/core/admin/admin-service-shapes.test.api.ts`, and a user read from the user service
 * accepted where the service takes the calling user.
 */
type StrictTokenReads<TService extends ContentApiTokenService | AdminTokenService, TToken> = Omit<
  TService,
  TokenServiceOverride
> & {
  /** The tokens the user may see. Reads the user's `id` and roles. */
  list(callingUser: UserInput): Promise<TokenResult<TToken>[]>;
  getById(...args: Parameters<TService['getById']>): Promise<TokenResult<TToken> | null>;
  getByName(...args: Parameters<TService['getByName']>): Promise<TokenResult<TToken> | null>;
  getByAccessKey(
    ...args: Parameters<TService['getByAccessKey']>
  ): Promise<TokenResult<ContentApiApiToken | AdminApiToken> | null>;
  update(...args: Parameters<TService['update']>): Promise<TokenResult<TToken>>;
  revoke(...args: Parameters<TService['revoke']>): Promise<TokenResult<TToken>>;
  regenerate(
    ...args: Parameters<TService['regenerate']>
  ): Promise<RegeneratedToken<ContentApiApiToken | AdminApiToken>>;
};

/** The content API token service with strict types. */
type StrictContentApiTokenService = StrictTokenReads<ContentApiTokenService, ContentApiApiToken> & {
  create(
    attributes: Parameters<ContentApiTokenService['create']>[0],
    callingUser?: UserInput
  ): Promise<TokenResult<ContentApiApiToken>>;
};

/** The admin token service with strict types. */
type StrictAdminTokenService = Omit<
  StrictTokenReads<AdminTokenService, AdminApiToken>,
  'assignAdminPermissionsToToken'
> & {
  create(
    attributes: Parameters<AdminTokenService['create']>[0],
    callingUser: UserInput,
    callingTokenPermissions?: Parameters<AdminTokenService['create']>[2]
  ): Promise<TokenResult<AdminApiToken>>;
  assignAdminPermissionsToToken(
    tokenId: Parameters<AdminTokenService['assignAdminPermissionsToToken']>[0],
    permissions: Parameters<AdminTokenService['assignAdminPermissionsToToken']>[1],
    ceilingUser: UserInput,
    callingTokenPermissions?: Parameters<AdminTokenService['assignAdminPermissionsToToken']>[3]
  ): ReturnType<AdminTokenService['assignAdminPermissionsToToken']>;
};

type RoleServiceOverride =
  | 'create'
  | 'findOne'
  | 'findOneWithUsersCount'
  | 'find'
  | 'findAllWithUsersCount'
  | 'update'
  | 'deleteByIds'
  | 'getSuperAdmin'
  | 'getSuperAdminWithUsersCount'
  | 'assignPermissions'
  | 'hasSuperAdminRole';

/**
 * The `admin::role` service with strict types: each result is the role row the query engine returns,
 * with the relations the call populates (`tests/api/core/admin/admin-service-shapes.test.api.ts`).
 * The reads resolve to `null` when no role matches.
 */
type StrictRoleService<TService> = Omit<TService, RoleServiceOverride> & {
  create(...args: Parameters<(typeof CERoleService)['create']>): Promise<RoleRow>;
  findOne<const TPopulate extends AdminPopulate<'admin::role'> | undefined = undefined>(
    params?: Parameters<(typeof CERoleService)['findOne']>[0],
    populate?: TPopulate
  ): Promise<RoleRow<TPopulate> | null>;
  findOneWithUsersCount<
    const TPopulate extends AdminPopulate<'admin::role'> | undefined = undefined,
  >(
    params?: Parameters<(typeof CERoleService)['findOneWithUsersCount']>[0],
    populate?: TPopulate
  ): Promise<RoleRowWithUsersCount<TPopulate> | null>;
  find<const TPopulate extends AdminPopulate<'admin::role'> | undefined = undefined>(
    params?: Parameters<(typeof CERoleService)['find']>[0],
    populate?: TPopulate
  ): Promise<RoleRow<TPopulate>[]>;
  /** The roles that match the query params, with the relations their `populate` names. */
  findAllWithUsersCount<
    const TParams extends Parameters<(typeof CERoleService)['findAllWithUsersCount']>[0],
  >(
    params: TParams
  ): Promise<RoleRowWithUsersCount<PopulateOfParams<'admin::role', TParams>>[]>;
  update(...args: Parameters<(typeof CERoleService)['update']>): Promise<RoleRow>;
  /** The deleted roles. */
  deleteByIds(...args: Parameters<(typeof CERoleService)['deleteByIds']>): Promise<RoleRow[]>;
  getSuperAdmin(): Promise<RoleRow | null>;
  getSuperAdminWithUsersCount(): Promise<RoleRowWithUsersCount | null>;
  /**
   * The permissions added to the role: the removed ones are all read from the role, so none of them
   * is returned (`differenceBy` in `services/role.ts`).
   */
  assignPermissions(
    ...args: Parameters<(typeof CERoleService)['assignPermissions']>
  ): Promise<PermissionRow[]>;
  /** Whether the user has the super admin role. Reads the user's roles. */
  hasSuperAdminRole(user: UserInput): boolean;
};

/**
 * The `admin::role` service as the admin's own code calls it, with the implementation's result types:
 * `findOne`, `findOneWithUsersCount`, `getSuperAdmin` and `getSuperAdminWithUsersCount` resolve to
 * `null` when no role matches, the result of the query engine's `findOne`
 * (`services/role.ts:87-107`, `:228-233`). The implementation keeps develop's published
 * `Promise<AdminRole>`, `Promise<AdminRoleWithUsersCount>` and `Promise<AdminRole | undefined>`.
 */
type ImplementationRoleService<TService extends { findOne: (...args: never[]) => unknown }> = Omit<
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
 * The registered `admin::role` service: {@link StrictRoleService} with strict types,
 * {@link ImplementationRoleService} without them.
 */
type RoleService<TService extends { findOne: (...args: never[]) => unknown }> =
  Core.IsStrict extends true ? StrictRoleService<TService> : ImplementationRoleService<TService>;

type UserServiceOverride =
  'findOne' | 'findOneByEmail' | 'updateById' | 'deleteById' | 'deleteByIds' | 'sanitizeUser';

/**
 * The registered `admin::user` service: {@link StrictUserService} with strict types,
 * {@link LegacyUserService} without them.
 */
type UserService<TService extends Record<UserServiceOverride, (...args: never[]) => unknown>> =
  Core.IsStrict extends true ? StrictUserService<TService> : LegacyUserService<TService>;

/**
 * The `admin::user` service with strict types: each result is the user row the query engine returns,
 * with the relations the call populates, in CE and EE
 * (`tests/api/core/admin/admin-service-shapes.test.api.ts`). The reads resolve to `null` when no
 * user matches.
 */
type StrictUserService<
  TService extends Record<UserServiceOverride, (...args: never[]) => unknown>,
> = Omit<TService, UserServiceOverride | 'create'> & {
  /** The created user with its roles. */
  create(...args: Parameters<(typeof CEUserService)['create']>): Promise<UserRowWithRoles>;
  /** The user with the relations `populate` names, its roles by default. */
  findOne<const TPopulate extends AdminPopulate<'admin::user'> = ['roles']>(
    id: Data.ID,
    populate?: TPopulate
  ): Promise<UserRow<TPopulate> | null>;
  /** The user with the relations `populate` names, none by default. */
  findOneByEmail<const TPopulate extends AdminPopulate<'admin::user'> = []>(
    email: string,
    populate?: TPopulate
  ): Promise<UserRow<TPopulate> | null>;
  updateById(...args: Parameters<TService['updateById']>): Promise<UserRowWithRoles | null>;
  deleteById(...args: Parameters<TService['deleteById']>): Promise<UserRowWithRoles | null>;
  /** The deleted users with their roles. A missing ID rejects. */
  deleteByIds(...args: Parameters<TService['deleteByIds']>): Promise<UserRowWithRoles[]>;
  /** The user without its private fields, and with its roles sanitized when it has them. */
  sanitizeUser<TUser extends object>(user: TUser): SanitizedUser<TUser>;
};

/**
 * The `admin::user` service without strict types, as runtime calls it, in CE and EE
 * (`tests/api/core/admin/admin-user-service-results.test.api.ts`). The query engine's results stay
 * `any` in the implementations, and the EE `updateById`, `deleteById` and `deleteByIds` infer them.
 * `findOne` and `updateById` resolve to `null` when no user matches; CE `updateById` keeps
 * develop's published `Promise<AdminUser>`.
 */
type LegacyUserService<
  TService extends Record<UserServiceOverride, (...args: never[]) => unknown>,
> = Omit<TService, UserServiceOverride> & {
  /** The user with its roles. With a `populate` other than the default, `roles` is not loaded. */
  findOne(...args: Parameters<(typeof CEUserService)['findOne']>): Promise<AdminUser | null>;
  /** The user without its roles. */
  findOneByEmail(
    ...args: Parameters<(typeof CEUserService)['findOneByEmail']>
  ): Promise<Omit<AdminUser, 'roles'> | null>;
  updateById(...args: Parameters<TService['updateById']>): Promise<AdminUser | null>;
  deleteById(...args: Parameters<TService['deleteById']>): Promise<AdminUser | null>;
  /** The deleted users with their roles. A missing ID rejects. */
  deleteByIds(...args: Parameters<TService['deleteByIds']>): Promise<AdminUser[]>;
  /** The user without its private fields and with its sanitized roles. */
  sanitizeUser(...args: Parameters<TService['sanitizeUser']>): ReturnType<TService['sanitizeUser']>;
  /**
   * A user read without its roles, such as a populated `createdBy` relation, keeps `roles`
   * undefined: the implementation maps them only when they are set (`services/user.ts:70`).
   */
  sanitizeUser(
    user: Omit<AdminUser, 'roles'>
  ): Omit<SanitizedAdminUser, 'roles'> & { roles: undefined };
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
 * Same fields as {@link ActionProviderInput}. The runtime validator accepts an optional
 * `subCategory` left out or `undefined` (`validation/action-provider.ts`), also under
 * `exactOptionalPropertyTypes`.
 */
type ActionRegistration = Readonly<
  Omit<ActionProviderInput, 'subCategory' | 'subjects' | 'options' | 'aliases'>
> & {
  readonly subCategory?: string | undefined;
  readonly subjects?: readonly string[] | undefined;
  readonly options?: { readonly applyToProperties: readonly string[] | null } | undefined;
  readonly aliases?:
    | readonly { readonly actionId: string; readonly subjects?: readonly string[] | undefined }[]
    | undefined;
};

/** What the provider hooks of the action provider receive: the key and the action. */
type ActionProviderHookContext = { key: string; value: Action };

/**
 * What the delete hooks of the action provider receive: the key and its action, read with `get`
 * (`@strapi/utils` `provider-factory.ts` `delete`).
 */
type ActionProviderDeleteHookContext = { key: string; value: Action | undefined };

/** The provider hooks of the action provider (`@strapi/utils` `providerFactory`), with typed handlers. */
type ActionProviderHooks = {
  willRegister: HooksUtils.AsyncSeriesHook<(context: ActionProviderHookContext) => unknown>;
  didRegister: HooksUtils.AsyncParallelHook<(context: ActionProviderHookContext) => unknown>;
  willDelete: HooksUtils.AsyncParallelHook<(context: ActionProviderDeleteHookContext) => unknown>;
  didDelete: HooksUtils.AsyncParallelHook<(context: ActionProviderDeleteHookContext) => unknown>;
};

/**
 * The action provider with strict types. Its provider hooks take typed handlers
 * ({@link ActionProviderHooks}). `register` and `registerMany` check that each action's
 * computed ID is a registered permission action (`Core.PermissionActionCheck`); reads accept any
 * runtime ID and reject an unregistered literal (`Core.PermissionActionLookup`). `registerMany`
 * resolves to the provider (`return this`), named here because the declaration emitter prints
 * `this` as `any`. Without strict types, the contract keeps the implementation's signatures.
 */
type StrictActionProvider = Omit<
  ActionProvider,
  'hooks' | 'register' | 'registerMany' | 'get' | 'has' | 'appliesToProperty' | 'unstable_aliases'
> & {
  hooks: Omit<ActionProvider['hooks'], keyof ActionProviderHooks> & ActionProviderHooks;
  register<const TAction extends ActionRegistration>(
    actionAttributes: Core.PermissionActionCheck<TAction>
  ): ReturnType<ActionProvider['register']>;
  registerMany<const TActions extends readonly ActionRegistration[]>(actionsAttributes: {
    [TIndex in keyof TActions]: Core.PermissionActionCheck<TActions[TIndex]>;
  }): Promise<StrictActionProvider>;
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

type ConditionProvider = (typeof PermissionService)['conditionProvider'];

/**
 * The condition provider with strict types. `registerMany` resolves to the provider (`return
 * this`), named here because the declaration emitter prints `this` as `any`.
 */
type StrictConditionProvider = Omit<ConditionProvider, 'registerMany'> & {
  registerMany(
    ...args: Parameters<ConditionProvider['registerMany']>
  ): Promise<StrictConditionProvider>;
};

type PermissionsManager = ReturnType<(typeof PermissionService)['createPermissionsManager']>;

/** The subject and action a sanitizer checks the data against; both default to the manager's. */
export type PermissionsManagerSanitizeOptions = { subject?: unknown; action?: string };

/**
 * A copy of a query without the filters, sort, populate and fields the ability does not permit. A
 * wildcard populate is expanded to the model's relations.
 */
type PermissionsManagerSanitizedQuery = Record<string, unknown>;

/** The permissions manager sanitizers. An array is sanitized entity by entity. */
export type PermissionsManagerSanitizers = {
  /** Resolves to `data` without the fields the ability may not read. */
  sanitizeOutput<TData>(data: TData, options?: PermissionsManagerSanitizeOptions): Promise<TData>;
  /** Resolves to `data` without the fields the ability may not write. */
  sanitizeInput<TData>(data: TData, options?: PermissionsManagerSanitizeOptions): Promise<TData>;
  sanitizeQuery(
    query: unknown,
    options?: PermissionsManagerSanitizeOptions
  ): Promise<PermissionsManagerSanitizedQuery>;
};

type PermissionsManagerSanitizerName = keyof PermissionsManagerSanitizers;

/**
 * What a permissions manager checks against: the user's CASL ability, the model UID, and the action
 * a check uses when it names none.
 */
type PermissionsManagerOptions<TAction extends string | undefined> = {
  ability: Ability;
  model: string;
  action?: TAction;
};

/** The permissions manager members written for strict types; the others come from the implementation. */
type StrictPermissionsManagerMembers<TAction extends string | undefined> = {
  /** The options' ability, action and model, as given. */
  ability: Ability;
  action: TAction;
  model: string;
  /** Tags `target` in place as a CASL subject of `subjectType`, the manager's model by default. */
  toSubject<TTarget extends object>(
    target: TTarget,
    subjectType?: string
  ): TTarget & ForcedSubject<string>;
  /**
   * The ability's conditions for the action, the manager's action by default, as a query filter.
   * Throws when neither names an action.
   */
  getQuery(queryAction?: string): ReturnType<PermissionsManager['getQuery']>;
  /**
   * A copy of the query, `{}` by default, whose `filters` also require the ability's conditions for
   * the action, the manager's action by default.
   */
  addPermissionsQueryTo<TQuery extends object = object>(
    query?: TQuery,
    action?: string
  ): Omit<TQuery, 'filters'> & { filters: unknown };
  validateQuery(
    data: unknown,
    options?: Parameters<PermissionsManager['validateQuery']>[1]
  ): ReturnType<PermissionsManager['validateQuery']>;
  validateInput(
    data: unknown,
    options?: Parameters<PermissionsManager['validateInput']>[1]
  ): ReturnType<PermissionsManager['validateInput']>;
};

type StrictPermissionsManager<TAction extends string | undefined> = Omit<
  PermissionsManager,
  keyof StrictPermissionsManagerMembers<TAction> | PermissionsManagerSanitizerName
> &
  StrictPermissionsManagerMembers<TAction> &
  PermissionsManagerSanitizers;

type SectionsBuilder = (typeof PermissionService)['sectionsBuilder'];

/**
 * The sections the admin creates, by name (`services/permission/sections-builder/index.ts`), in the
 * form `GET /admin/permissions` serves them. Other sections are created by their owner.
 */
type BuiltInSections = {
  plugins: PluginPermission[];
  settings: SettingPermission[];
  singleTypes: ContentPermission;
  collectionTypes: ContentPermission;
};

/** The section a handler registered on `TName` receives: unknown unless the admin creates it. */
type SectionFor<TName extends string> = TName extends keyof BuiltInSections
  ? BuiltInSections[TName]
  : unknown;

/** A section handler: adds what an action contributes to the section, in place. */
type SectionHandler<TSection> = (context: { action: Action; section: TSection }) => unknown;

/** The sections builder members written for strict types: handlers receive their section. */
type StrictSectionsBuilderMembers = {
  /** A section calls its matchers with the action, and its handlers with the factory's state. */
  createSection<TSection>(
    sectionName: string,
    options: {
      initialStateFactory?: () => TSection;
      handlers?: SectionHandler<TSection>[];
      matchers?: ((action: Action) => unknown)[];
    }
  ): StrictSectionsBuilder;
  deleteSection(sectionName: string): StrictSectionsBuilder;
  addHandler<TName extends string>(
    sectionName: TName,
    handler: SectionHandler<SectionFor<TName>>
  ): StrictSectionsBuilder;
  addMatcher(sectionName: string, matcher: (action: Action) => unknown): StrictSectionsBuilder;
  /** Every section built from the actions, by section name. */
  build(actions?: Action[]): Promise<BuiltInSections & Record<string, unknown>>;
};

type StrictSectionsBuilder = Omit<SectionsBuilder, keyof StrictSectionsBuilderMembers> &
  StrictSectionsBuilderMembers;

type PermissionEngine = (typeof PermissionService)['engine'];

/**
 * The permission queries and engine members written for strict types: the permissions are the rows
 * the permission domain returns, a user read from the user service is accepted where the engine
 * takes a user, and the engine hooks take typed handlers.
 */
type StrictPermissionQueries = {
  findMany(...args: Parameters<(typeof PermissionService)['findMany']>): Promise<PermissionRow[]>;
  createMany(
    ...args: Parameters<(typeof PermissionService)['createMany']>
  ): Promise<PermissionRow[]>;
  /** The permissions of the user's roles. Reads the user's `id`. */
  findUserPermissions(user: { id: Data.ID }): Promise<PermissionRow[]>;
  engine: Omit<PermissionEngine, 'generateUserAbility' | 'hooks'> & {
    /** The hooks of the engine (`@strapi/permissions`), with typed handlers. */
    readonly hooks: PermissionsEngine.TypedPermissionEngineHooks;
    /** The ability of the user's permissions. The conditions receive the user. */
    generateUserAbility(user: UserInput): ReturnType<PermissionEngine['generateUserAbility']>;
  };
};

type StrictPermissionQueryName = keyof StrictPermissionQueries;

/**
 * The `admin::permission` service as the admin's own code calls it. The implementation keeps its
 * published develop signatures: the action provider requires a category, permission queries take
 * two arguments, and section hooks receive no arguments. With strict types, the permissions manager
 * is written from its options, its sanitizers resolve to the data they were given, the providers'
 * `registerMany` resolves to the provider, and the sections builder hands each handler the section
 * it is registered on.
 */
type ImplementationPermissionService = Omit<
  typeof PermissionService,
  'actionProvider' | 'conditionProvider' | 'createPermissionsManager' | 'sectionsBuilder'
> & {
  conditionProvider: Core.IsStrict extends true ? StrictConditionProvider : ConditionProvider;
  sectionsBuilder: Core.IsStrict extends true
    ? StrictSectionsBuilder
    : Omit<SectionsBuilder, 'addHandler' | 'addMatcher'> & {
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
} & (Core.IsStrict extends true
    ? {
        createPermissionsManager<TAction extends string | undefined = undefined>(
          options: PermissionsManagerOptions<TAction>
        ): StrictPermissionsManager<TAction>;
      }
    : {
        createPermissionsManager(
          ...args: Parameters<(typeof PermissionService)['createPermissionsManager']>
        ): Omit<PermissionsManager, 'addPermissionsQueryTo' | PermissionsManagerSanitizerName> & {
          /** The query defaults to `{}`, the action to the manager's action. */
          addPermissionsQueryTo(
            query?: object,
            action?: unknown
          ): ReturnType<PermissionsManager['addPermissionsQueryTo']>;
        } & (Core.IsStrict extends true
            ? PermissionsManagerSanitizers
            : Pick<PermissionsManager, PermissionsManagerSanitizerName>);
      });

/**
 * The registered `admin::permission` service. With strict types, the queries resolve to the
 * permission rows and the engine takes a user read from the user service
 * ({@link StrictPermissionQueries}).
 */
type PermissionServiceContract = Core.IsStrict extends true
  ? Omit<ImplementationPermissionService, StrictPermissionQueryName> & StrictPermissionQueries
  : ImplementationPermissionService;

type TransferPermissionService = (typeof TransferService)['permission'];

/**
 * The `admin::transfer` service with strict types: the transfer permission engine takes typed
 * handlers and typed permissions (`@strapi/permissions` `TypedEngine`).
 */
type StrictTransferService = Omit<typeof TransferService, 'permission'> & {
  permission: Omit<TransferPermissionService, 'engine'> & { engine: PermissionsEngine.TypedEngine };
};

/**
 * The `role` and `permission` services as the admin's own code reads them with `getService`
 * (`utils/index.d.ts`) under strict types: with the implementation's result types. Applications
 * read the registered contracts, whose results are the rows the query engine returns.
 */
export type ImplementationServices = {
  role: ImplementationRoleService<
    EditionService<typeof CERoleService, EnterpriseContracts['role']>
  >;
  permission: ImplementationPermissionService;
};

/**
 * EE runtime shapes of the admin services that the EE edition extends. EE code runs only with the
 * EE edition merged, so it passes them whatever the program's license scope. They keep the
 * implementation's result types, as the admin's own code reads them.
 */
export type EnterpriseServices = {
  auth: EnterpriseService<typeof CEAuthService, typeof EEAuthService>;
  metrics: EnterpriseService<typeof CEMetricsService, typeof EEMetricsService>;
  passport: EnterpriseService<typeof CEPassportService, typeof EEPassportService>;
  role: ImplementationRoleService<EnterpriseService<typeof CERoleService, typeof EERoleService>>;
  user: EnterpriseService<typeof CEUserService, typeof EEUserService>;
};

/**
 * The EE members of the registered `admin::auth`, `admin::role` and `admin::user` contracts. With
 * strict types, the EE members whose implementation takes `any` take what their callers pass:
 * `forgotPassword`, `resetPassword` and `updateById` the parameters of the CE member they replace
 * (`services/auth.ts:139`, `:180`, `services/user.ts:162-165`), `ssoCheckRolesIdForDeletion` the
 * IDs of the roles to delete (`ee/server/src/validation/role.ts:33`, `:58`). Results and other
 * members stay the implementation's.
 */
export type EnterpriseContracts = {
  auth: Core.IsStrict extends true
    ? Omit<typeof EEAuthService, 'forgotPassword' | 'resetPassword'> & {
        forgotPassword(
          ...args: Parameters<(typeof CEAuthService)['forgotPassword']>
        ): ReturnType<(typeof EEAuthService)['forgotPassword']>;
        resetPassword(
          ...args: Parameters<(typeof CEAuthService)['resetPassword']>
        ): ReturnType<(typeof EEAuthService)['resetPassword']>;
      }
    : typeof EEAuthService;
  role: Core.IsStrict extends true
    ? Omit<typeof EERoleService, 'ssoCheckRolesIdForDeletion'> & {
        ssoCheckRolesIdForDeletion(
          ids: Data.ID[]
        ): ReturnType<(typeof EERoleService)['ssoCheckRolesIdForDeletion']>;
      }
    : typeof EERoleService;
  user: Core.IsStrict extends true
    ? Omit<typeof EEUserService, 'updateById'> & {
        updateById(
          ...args: Parameters<(typeof CEUserService)['updateById']>
        ): ReturnType<(typeof EEUserService)['updateById']>;
      }
    : typeof EEUserService;
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
        'admin::api-token': Core.IsStrict extends true
          ? StrictContentApiTokenService
          : ContentApiTokenService;
        'admin::api-token-admin': Core.IsStrict extends true
          ? StrictAdminTokenService
          : AdminTokenService;
        'admin::api-token-content-api': Core.IsStrict extends true
          ? StrictContentApiTokenService
          : ContentApiTokenService;
        'admin::auth': EditionService<typeof CEAuthService, EnterpriseContracts['auth']>;
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
        'admin::role': RoleService<
          EditionService<typeof CERoleService, EnterpriseContracts['role']>
        >;
        'admin::seat-enforcement': Core.Licensed<'licensed', typeof EESeatEnforcementService>;
        'admin::token': typeof TokenService;
        'admin::transfer': Core.IsStrict extends true
          ? StrictTransferService
          : typeof TransferService;
        'admin::user': UserService<
          EditionService<typeof CEUserService, EnterpriseContracts['user']>
        >;
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
       * merges its actions over `admin`, `authentication`, `permission`, `role` and `user`
       * (`ee/server/src/controllers/index.ts`, `Core.LicensedExtension`), like the services it
       * extends.
       */
      interface PackageControllers {
        'admin::admin': Core.LicensedExtension<Controllers['admin'], EEControllers['admin']>;
        'admin::admin-token': Controllers['admin-token'];
        'admin::ai': Controllers['ai'];
        'admin::api-token': Controllers['api-token'];
        /**
         * Added by the EE edition when the license that verifies at boot lists `audit-logs` and
         * `admin.auditLogs.enabled` is not `false` (`isAuditLogsEnabled`). The types cannot read
         * the option, so the controller stays possibly `undefined` when the application lists the
         * feature.
         */
        'admin::audit-logs': Core.Licensed<'audit-logs', EEControllers['audit-logs'] | undefined>;
        'admin::authenticated-session': Controllers['authenticated-session'];
        'admin::authenticated-user': Controllers['authenticated-user'];
        'admin::authentication': Core.LicensedExtension<
          Controllers['authentication'],
          EEControllers['authentication']
        >;
        'admin::content-api': Controllers['content-api'];
        'admin::homepage': Controllers['homepage'];
        'admin::permission': Core.LicensedExtension<
          Controllers['permission'],
          EEControllers['permission']
        >;
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
         * EE: registered when the license lists `audit-logs`. `admin.auditLogs.enabled: false` keeps
         * it registered, so stored grants survive, and `GET /admin/permissions` marks it
         * `disabledByConfig`.
         */
        'admin::audit-logs.read': true;
        /**
         * EE: registered when the license lists `audit-logs`. `admin.auditLogs.enabled: false` keeps
         * it registered, so stored grants survive, and `GET /admin/permissions` marks it
         * `disabledByConfig`.
         */
        'admin::audit-logs.export': true;
      }
    }
  }
}
