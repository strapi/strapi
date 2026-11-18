import type { Core, Modules, Schema } from '@strapi/strapi';
import type { hooks } from '@strapi/utils';
import type {} from '@strapi/plugin-graphql/strapi-server';

// The contract members the contract-`any` round typed, as an application with strict types and
// every licensed feature listed sees them: an `any` put back in one of them fails here.
//
// Deliberately not guarded, because they still carry `any`:
// - `admin::content-type.getPermissionsWithNestedFields` `actions`: accepted residual.
// - `plugin::graphql.builders.get` and `plugin::graphql.utils.mappers.strapiScalarToGraphQLScalar`:
//   the precise Nexus types are a follow-up.
// - The `entry` of the content-releases action rows (`Modules.Documents.AnyDocument`), and the
//   members whose only `any` is that `entry` (`release.create`, `release.delete`,
//   `release.recordMissedRun`, `release-action.groupActions`).
// - The `@strapi/utils` hooks of the providers (`hooks`) and of `admin::role.hooks`, which their own
//   units type now that https://github.com/strapi/strapi/pull/28663 merged, and `plugin::i18n.permissions.engine`, which waits
//   on https://github.com/strapi/strapi/pull/28665.
// - The rows the round left out: `admin::passport`, the content-manager `relations` controller, and
//   the `strapi::responses`, `strapi::security` and `strapi::session` middlewares.

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type IsAny<T> = 0 extends 1 & T ? true : false;

type Service<TUID extends string> = Core.ServiceFor<TUID>;

/**
 * Types the walk does not enter. Library and third-party declarations use `any` of their own: the
 * application view skips them too. They are named through the `@strapi/types` and `@strapi/utils`
 * types that expose them, never through a guarded contract, and matched by shape: each one has
 * members an ordinary object does not have.
 */
type Opaque =
  | Core.Strapi
  | Date
  | RegExp
  | NodeJS.ReadableStream
  | Buffer
  // Koa
  | Parameters<Core.ControllerHandler>[0]
  // https://github.com/strapi/strapi/pull/28663 types the hooks.
  | hooks.Hook
  // CASL
  | Modules.MCP.McpHandlerContext['userAbility'];

/**
 * Third-party unions the walk does not enter either. Matched as a whole, without `null` and
 * `undefined`: each has a record of `any` among its members, which every object matches.
 */
type OpaqueUnions =
  // json-logic-js
  | [NonNullable<Schema.Attribute.Attribute['conditions']>['visible']]
  // CASL
  | [Modules.Permissions.PermissionRule['subject']];
type IsOpaqueUnion<T, TUnions = OpaqueUnions> = true extends (
  TUnions extends [infer U]
    ? Equal<Exclude<T, null | undefined>, Exclude<U, null | undefined>>
    : never
)
  ? true
  : false;

// `Next[D]` is `D - 1`.
type Next = [never, 0, 1, 2, 3, 4, 5];
type At<TSegment extends string, TPath> = TPath extends ''
  ? TSegment
  : TPath extends string
    ? `${TSegment}.${TPath}`
    : never;
type Key<K> = K extends string | number ? (string extends K ? '[index]' : `${K}`) : '[symbol]';

/**
 * The paths of `T` that are `any`, `never` when there is none: object members, call parameters and
 * results, array, promise, map and set items, 6 levels deep. It does not enter `Opaque` types and
 * `OpaqueUnions`.
 */
type AnyPaths<T, D extends number = 6> =
  IsAny<T> extends true
    ? ''
    : [D] extends [never]
      ? never
      : IsOpaqueUnion<T> extends true
        ? never
        : Walk<T, D>;

/** `AnyPaths`, member by member of a union. */
type Walk<T, D extends number> = T extends Opaque
  ? never
  : T extends PromiseLike<infer U>
    ? At<'Promise<0>', AnyPaths<U, Next[D]>>
    : T extends readonly unknown[]
      ? At<'Array<0>', AnyPaths<T[number], Next[D]>>
      : T extends ReadonlyMap<infer K, infer V>
        ? At<'Map<0>', AnyPaths<K, Next[D]>> | At<'Map<1>', AnyPaths<V, Next[D]>>
        : T extends ReadonlySet<infer U>
          ? At<'Set<0>', AnyPaths<U, Next[D]>>
          : T extends object
            ? | (T extends (...args: infer A) => infer R
                  ? | (IsAny<A> extends true
                        ? '(args)'
                        : At<'(args)', AnyPaths<A[number], Next[D]>>)
                    | At<'=>', AnyPaths<R, Next[D]>>
                  : never)
              | { [K in keyof T]-?: At<Key<K>, AnyPaths<T[K], Next[D]>> }[keyof T]
            : never;

type HasAny<T> = [AnyPaths<T>] extends [never] ? false : true;

// The walk itself: an `any` opaque type would stop it everywhere, and it finds nested `any`.
declare const walkChecks: [
  Core.Assert<Equal<[IsAny<Opaque>], [false]>>,
  Core.Assert<Equal<[IsAny<OpaqueUnions[0]>], [false]>>,
  Core.Assert<
    Equal<[{ properties: Record<string, unknown> } extends Opaque ? true : false], [false]>
  >,
  Core.Assert<Equal<[IsOpaqueUnion<Record<string, any>>], [false]>>,
  Core.Assert<Equal<[HasAny<(id: number) => Promise<{ items: Array<{ value: any }> }>>], [true]>>,
  Core.Assert<Equal<[HasAny<{ update(params: { where: Record<string, any> }): void }>], [true]>>,
  Core.Assert<Equal<[HasAny<(...args: any[]) => void>], [true]>>,
  Core.Assert<
    Equal<[HasAny<(id: number) => Promise<{ items: Array<{ value: string }> }>>], [false]>
  >,
];
walkChecks satisfies unknown;

// Admin: `Permission.properties` (C01).
declare const apiTokenChecks: [
  Core.Assert<Equal<[HasAny<Service<'admin::api-token'>['getByAccessKey']>], [false]>>,
  Core.Assert<
    Equal<[HasAny<Service<'admin::api-token'>['reconcileTokenPermissionsToUserCeiling']>], [false]>
  >,
  Core.Assert<
    Equal<[HasAny<Service<'admin::api-token'>['reconcileParameterizedTokenPermissions']>], [false]>
  >,
  Core.Assert<Equal<[HasAny<Service<'admin::api-token-admin'>['create']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'admin::api-token-admin'>['getById']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'admin::api-token-admin'>['getByName']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'admin::api-token-admin'>['update']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'admin::api-token-admin'>['revoke']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'admin::api-token-admin'>['regenerate']>], [false]>>,
  Core.Assert<
    Equal<[HasAny<Service<'admin::api-token-admin'>['assignAdminPermissionsToToken']>], [false]>
  >,
  Core.Assert<Equal<[HasAny<Service<'admin::api-token-admin'>['getByAccessKey']>], [false]>>,
  Core.Assert<
    Equal<
      [HasAny<Service<'admin::api-token-admin'>['reconcileTokenPermissionsToUserCeiling']>],
      [false]
    >
  >,
  Core.Assert<
    Equal<
      [HasAny<Service<'admin::api-token-admin'>['reconcileParameterizedTokenPermissions']>],
      [false]
    >
  >,
  Core.Assert<Equal<[HasAny<Service<'admin::api-token-content-api'>['getByAccessKey']>], [false]>>,
  Core.Assert<
    Equal<
      [HasAny<Service<'admin::api-token-content-api'>['reconcileTokenPermissionsToUserCeiling']>],
      [false]
    >
  >,
  Core.Assert<
    Equal<
      [HasAny<Service<'admin::api-token-content-api'>['reconcileParameterizedTokenPermissions']>],
      [false]
    >
  >,
];
apiTokenChecks satisfies unknown;

// Admin permission service: `properties` (C01), the providers' `registerMany` (C08), the
// permissions manager factory (C07b) and the sections builder (H4).
declare const permissionChecks: [
  Core.Assert<Equal<[HasAny<Service<'admin::permission'>['createMany']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'admin::permission'>['findMany']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'admin::permission'>['sanitizePermission']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'admin::permission'>['conditionProvider']>], [false]>>,
  Core.Assert<
    Equal<[HasAny<Omit<Service<'admin::permission'>['actionProvider'], 'hooks'>>], [false]>
  >,
  Core.Assert<Equal<[HasAny<Service<'admin::permission'>['createPermissionsManager']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'admin::permission'>['sectionsBuilder']>], [false]>>,
];
permissionChecks satisfies unknown;

/** The handler each hook of a permission engine registers. The walk does not enter the hooks. */
type EngineHookHandlers<THooks> = {
  [K in keyof THooks]: THooks[K] extends { register(handler: infer THandler): unknown }
    ? THandler
    : never;
};

// Admin permission engines: the engine hooks of `admin::permission` and the transfer permission
// engine of `admin::transfer` (H3).
declare const permissionEngineChecks: [
  Core.Assert<
    Equal<[HasAny<EngineHookHandlers<Service<'admin::permission'>['engine']['hooks']>>], [false]>
  >,
  Core.Assert<
    Equal<
      [HasAny<EngineHookHandlers<Service<'admin::transfer'>['permission']['engine']['hooks']>>],
      [false]
    >
  >,
  Core.Assert<Equal<[HasAny<Service<'admin::transfer'>['permission']['engine']>], [false]>>,
];
permissionEngineChecks satisfies unknown;

// Admin role service: `properties` (C01), the query parameters (C02), the EE IDs (C05b).
declare const roleChecks: [
  Core.Assert<Equal<[HasAny<Service<'admin::role'>['create']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'admin::role'>['findAllWithUsersCount']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'admin::role'>['update']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'admin::role'>['count']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'admin::role'>['addPermissions']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'admin::role'>['checkPermissionsCeiling']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'admin::role'>['assignPermissions']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'admin::role'>['ssoCheckRolesIdForDeletion']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'admin::role'>['findOne']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'admin::role'>['findOneWithUsersCount']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'admin::role'>['getSuperAdmin']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'admin::role'>['getSuperAdminWithUsersCount']>], [false]>>,
];
roleChecks satisfies unknown;

// Admin user, auth, persist-tables, project-settings and content-type services (C03 to C06).
declare const adminServiceChecks: [
  Core.Assert<Equal<[HasAny<Service<'admin::user'>['findOne']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'admin::user'>['findOneByEmail']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'admin::user'>['updateEEDisabledUsersList']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'admin::user'>['deleteByIds']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'admin::user'>['deleteById']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'admin::user'>['updateById']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'admin::auth'>['forgotPassword']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'admin::auth'>['resetPassword']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'admin::persist-tables'>['findTables']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'admin::project-settings'>['deleteOldFiles']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'admin::content-type'>['getNestedFields']>], [false]>>,
  Core.Assert<
    Equal<[HasAny<Service<'admin::content-type'>['getNestedFieldsWithIntermediate']>], [false]>
  >,
  // Every parameter but `actions` (left `any`), and the result.
  Core.Assert<
    Equal<
      [
        HasAny<
          [
            Parameters<Service<'admin::content-type'>['getPermissionsWithNestedFields']>[1],
            ReturnType<Service<'admin::content-type'>['getPermissionsWithNestedFields']>,
          ]
        >,
      ],
      [false]
    >
  >,
];
adminServiceChecks satisfies unknown;

// Admin event payloads: `properties` (C01).
declare const adminEventChecks: [
  Core.Assert<Equal<[HasAny<Strapi.Registries.Events['role.delete']>], [false]>>,
  Core.Assert<Equal<[HasAny<Strapi.Registries.Events['permission.create']>], [false]>>,
  Core.Assert<Equal<[HasAny<Strapi.Registries.Events['permission.update']>], [false]>>,
];
adminEventChecks satisfies unknown;

type ReleaseAction = Service<'plugin::content-releases.release-action'>;
type FindPageActions = Awaited<ReturnType<ReleaseAction['findPage']>>;

// Content releases: the release reads and writes (R03, R04, R04b) and the action results (R02).
declare const contentReleasesChecks: [
  Core.Assert<Equal<[HasAny<Service<'plugin::content-releases.release'>['findOne']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'plugin::content-releases.release'>['findPage']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'plugin::content-releases.release'>['findMany']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'plugin::content-releases.release'>['update']>], [false]>>,
  Core.Assert<
    Equal<[HasAny<Service<'plugin::content-releases.release'>['getAllComponents']>], [false]>
  >,
  Core.Assert<Equal<[HasAny<ReleaseAction['createMany']>], [false]>>,
  Core.Assert<Equal<[HasAny<ReleaseAction['create']>], [false]>>,
  Core.Assert<Equal<[HasAny<ReleaseAction['update']>], [false]>>,
  Core.Assert<Equal<[HasAny<ReleaseAction['delete']>], [false]>>,
  Core.Assert<Equal<[HasAny<ReleaseAction['countActions']>], [false]>>,
  Core.Assert<Equal<[HasAny<ReleaseAction['getContentTypeModelsFromActions']>], [false]>>,
  // `findPage`, but the `entry` of its rows.
  Core.Assert<
    Equal<
      [
        HasAny<
          [
            Parameters<ReleaseAction['findPage']>,
            Omit<FindPageActions, 'results'>,
            Omit<FindPageActions['results'][number], 'entry'>,
          ]
        >,
      ],
      [false]
    >
  >,
];
contentReleasesChecks satisfies unknown;

// i18n: the permissions actions (I01) and sections builder (H5).
declare const i18nChecks: [
  Core.Assert<Equal<[HasAny<Service<'plugin::i18n.permissions'>['actions']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'plugin::i18n.permissions'>['sectionsBuilder']>], [false]>>,
];
i18nChecks satisfies unknown;

type GraphQLExtension = Service<'plugin::graphql.extension'>;

// graphql: the shadow CRUD managers of the extension (Q01), and the builders, internals and utils
// helpers (Q02). The rest of the extension reads Nexus and graphql-tools types.
declare const graphqlChecks: [
  Core.Assert<Equal<[HasAny<GraphQLExtension['shadowCRUD']>], [false]>>,
  Core.Assert<Equal<[HasAny<ReturnType<GraphQLExtension['use']>['shadowCRUD']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'plugin::graphql.builders'>['new']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'plugin::graphql.builders'>['utils']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'plugin::graphql.internals'>['buildInternalTypes']>], [false]>>,
  Core.Assert<Equal<[HasAny<Service<'plugin::graphql.utils'>['attributes']>], [false]>>,
  Core.Assert<
    Equal<
      [HasAny<Omit<Service<'plugin::graphql.utils'>['mappers'], 'strapiScalarToGraphQLScalar'>>],
      [false]
    >
  >,
];
graphqlChecks satisfies unknown;

// `@strapi/core`: the `strapi::cors` config (K01).
declare const coreChecks: [
  Core.Assert<Equal<[HasAny<Core.MiddlewareConfigFor<'strapi::cors'>>], [false]>>,
];
coreChecks satisfies unknown;
