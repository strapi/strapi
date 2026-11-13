import type { UID } from '@strapi/types';

export const PLUGIN_ID = 'end-users';

/** A secret shorter than this is reported as too short (boot warning and the admin's summary) */
export const MIN_SECRET_LENGTH = 32;

export const USER_UID = 'plugin::end-users.user' as const satisfies UID.ContentType;
export const ROLE_UID = 'plugin::end-users.role' as const satisfies UID.ContentType;
/**
 * The one Content API action the role type has: reading a role through a relation of another type
 * (`user.roles`). There is no route for it. A role of the editor grants it as a `find` row on the
 * role type, and core's field rules for a relation to the type read it (see `registerRoleReadAction`).
 */
export const ROLE_FIND_ACTION = `${ROLE_UID}.find`;
export const PERMISSION_UID = 'plugin::end-users.permission' as const satisfies UID.ContentType;
export const PROFILE_UID = 'plugin::end-users.profile' as const satisfies UID.ContentType;
export const SESSION_UID = 'plugin::end-users.session' as const satisfies UID.ContentType;
export const ACCOUNT_UID = 'plugin::end-users.account' as const satisfies UID.ContentType;
export const VERIFICATION_UID = 'plugin::end-users.verification' as const satisfies UID.ContentType;
export const TWO_FACTOR_UID = 'plugin::end-users.two-factor' as const satisfies UID.ContentType;
export const RATE_LIMIT_UID = 'plugin::end-users.rate-limit' as const satisfies UID.ContentType;
/**
 * The sign-in lockout's counters. Their own table, never the rate-limit one: Better Auth deletes
 * every row of that table older than its longest window, which is a minute or so, and a lockout
 * lasts minutes to hours.
 */
export const LOCKOUT_COUNTER_UID =
  'plugin::end-users.lockout-counter' as const satisfies UID.ContentType;

/**
 * The GraphQL type names of the plugin's public types, set as `pluginOptions.graphql.typeName` (the
 * GraphQL plugin names every type, query and mutation of a type from it, with no plugin prefix).
 * The other types of the plugin are hidden from GraphQL (see `register`). These are the names
 * without the Users & Permissions compatibility mode; `graphqlTypeNames` gives the ones in use.
 */
export const GRAPHQL_TYPE_NAMES = {
  user: { singular: 'EndUser', plural: 'EndUsers' },
  role: { singular: 'EndUserRole', plural: 'EndUserRoles' },
  profile: { singular: 'EndUserProfile', plural: 'EndUserProfiles' },
} as const;

/**
 * The same types under the names Users & Permissions gave its own, so a client's queries,
 * fragments and generated types keep working while the compatibility mode is on. The profile has
 * no counterpart there and keeps its name.
 */
export const COMPAT_GRAPHQL_TYPE_NAMES = {
  user: { singular: 'UsersPermissionsUser', plural: 'UsersPermissionsUsers' },
  role: { singular: 'UsersPermissionsRole', plural: 'UsersPermissionsRoles' },
  profile: GRAPHQL_TYPE_NAMES.profile,
} as const;

/**
 * What an answer that is the caller's own says to caches: no shared cache may keep it
 * (`private`), and nothing may store it at all (`no-store`). A cookie-authenticated GET carries no
 * `Authorization` header, which is otherwise what keeps a shared cache from storing it. The `me`
 * routes and `/api/end-users/permissions/me` set it before anything else, so a refusal says it too.
 */
export const PER_USER_CACHE_CONTROL = 'private, no-store';
