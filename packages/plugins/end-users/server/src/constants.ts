export const PLUGIN_ID = 'end-users';

/** A secret shorter than this is reported as too short (boot warning and the admin's summary) */
export const MIN_SECRET_LENGTH = 32;

export const USER_UID = 'plugin::end-users.user';
export const ROLE_UID = 'plugin::end-users.role';
export const PERMISSION_UID = 'plugin::end-users.permission';
export const PROFILE_UID = 'plugin::end-users.profile';
export const SESSION_UID = 'plugin::end-users.session';
export const ACCOUNT_UID = 'plugin::end-users.account';
export const VERIFICATION_UID = 'plugin::end-users.verification';
export const TWO_FACTOR_UID = 'plugin::end-users.two-factor';
export const RATE_LIMIT_UID = 'plugin::end-users.rate-limit';

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
